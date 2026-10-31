// @vitest-environment jsdom
//
// `@exodra/core` exports the markup SPELLING of an attribute and stops: the VALUE rule is
// re-derived inside every backend, which is the shape that drifts. It is the rule under every
// conditional attribute on a page, where `disabled="false"` is a disabled control.
//
// The component sets the class port to `null` only; the other class-port values are pinned from
// the inside by `exo-term-writer-for-port.test.ts` rather than widened into this rule.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenWiring,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, it } from 'vitest';
import { assertExoConformanceRule, renders } from '../../index';
import { createExoTestMachine } from '@exodra/test-utils';

const everyAbsenceCase = () =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let gone!: TExoAttrPort;
            let off!: TExoAttrPort;
            let on!: TExoAttrPort;
            let cls!: TExoAttrPort;
            b.el('div', null, (d) => {
                gone = d.port('data-gone');
                off = d.port('data-off');
                on = d.port('data-on');
                cls = d.port('class');
            });
            return { gone, off, on, cls };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.attr(P.gone, null);
                // `false` REMOVES the attribute: present with a falsy value is still present.
                c.attr(P.off, false);
                // `true` prints as the EMPTY value: that is what the DOM backend puts in the tree.
                c.attr(P.on, true);
                // `class` has no removal case: written through `className`, which coerces `null`.
                c.attr(P.cls, null);
            }
    );

describe('the attribute ABSENCE rule, re-derived by three backends out of one file’s prose', () => {
    it('agrees on nullish, false, true — and now on a class port set to null, which forked', () => {
        assertExoConformanceRule({
            name: 'one <div> carrying data-gone=null, data-off=false, data-on=true, class=null',
            subject: () => ({ component: everyAbsenceCase() }),
            expect: {
                dom: renders(),
                string: renders(),
                term: renders(),
                hydrate: renders(),
            },
            agreement: [['dom', 'hydrate', 'string', 'term']],
        });
    });
});
