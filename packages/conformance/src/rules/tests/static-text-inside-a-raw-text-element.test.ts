// @vitest-environment jsdom
//
// Every backend that EMITS MARKUP consults `EXO_RAW_TEXT_ELEMENTS`; the one that emits none has no
// escaping at all. A markup-emitting backend skipping the table ships broken stylesheets.
//
// Escaping is invisible to this artefact almost everywhere, `&lt;` and `<` being one text node once
// a parser has run. A raw-text element is the one place it shows, for the same reason the rule
// exists: the parser decodes NO character references there, so `&gt;` survives as four characters
// where `>` survives as one — turning `.a > .b` into a rule matching nothing.
import type { TExoSchemaCursor, TExoChildrenWiring, TExoMachineInitialState } from '@exodra/core';
import { describe, it } from 'vitest';
import { assertExoConformanceRule, renders } from '../../index';
import { createExoTestMachine } from '@exodra/test-utils';

// Contains both characters an escaper would touch.
const STYLESHEET = '.a > .b { color: red } /* a && b */';

const styleElement = () =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            b.el('style', null, (s) => {
                s.text(STYLESHEET);
            });
            return {};
        },
        (): TExoMachineInitialState<TExoChildrenWiring> => () => undefined
    );

describe('a static stylesheet, which no parser decodes', () => {
    it('is emitted verbatim by every backend that emits anything at all', () => {
        assertExoConformanceRule({
            name: 'static text inside a <style>, where an escape would survive as characters',
            subject: () => ({ component: styleElement() }),
            expect: {
                dom: renders(),
                string: renders(),
                // Never escapes, emitting no bytes anybody re-parses — a DIFFERENT exemption from
                // the markup backends', which consult the table and decline.
                term: renders(),
                hydrate: renders(),
            },
            // Two of the four reach the same page by opposite routes; this says the routes meet.
            agreement: [['dom', 'hydrate', 'string', 'term']],
        });
    });
});
