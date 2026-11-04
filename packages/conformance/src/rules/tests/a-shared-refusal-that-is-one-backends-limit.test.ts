// @vitest-environment jsdom
//
// A shape every backend's schema compiler refuses, though its reason applies to one backend only:
// a `<br>` with content is about re-parsing markup. Refusing everywhere is what makes a schema accepted or refused
// identically, and the checks are plain functions with no backend parameter, so opting out is not
// an option that exists to be rejected. The cost is a narrower dialect for everybody.
//
// It is asked by the SCHEMA COMPILER and not the schema cursor, so the declaration BUILDS
// everywhere and dies once per backend when that backend compiles it.
import type { TExoSchemaCursor, TExoChildrenWiring, TExoMachineInitialState } from '@exodra/core';
import { describe, it } from 'vitest';
import { EXO_STAGE_SCHEMA_COMPILE, assertExoConformanceRule, refusesAt } from '../../index';
import { createExoTestMachine } from '@exodra/test-utils';

const voidElementWithContent = () =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            b.el('br', null, (br) => {
                br.text('x');
            });
            return {};
        },
        (): TExoMachineInitialState<TExoChildrenWiring> => () => undefined
    );

describe('rules every backend asks and only one backend needs', () => {
    it('a void element with content is refused by all four, at the same layer', () => {
        assertExoConformanceRule({
            name: 'a <br> given static text',
            subject: () => ({ component: voidElementWithContent() }),
            expect: {
                dom: refusesAt(EXO_STAGE_SCHEMA_COMPILE),
                // Its own here: `</br>` is re-parsed into a second `<br>`, so the two stop matching.
                string: refusesAt(EXO_STAGE_SCHEMA_COMPILE),
                term: refusesAt(EXO_STAGE_SCHEMA_COMPILE),
                hydrate: refusesAt(EXO_STAGE_SCHEMA_COMPILE),
            },
            agreement: [],
        });
    });
});
