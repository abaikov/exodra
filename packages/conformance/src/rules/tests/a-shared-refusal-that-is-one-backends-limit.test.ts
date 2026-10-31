// @vitest-environment jsdom
//
// Two shapes every backend's schema compiler refuses, though each reason applies to one backend
// only: text after a children port is about the DOM backend's anchoring, a `<br>` with content
// about re-parsing markup. Refusing everywhere is what makes a schema accepted or refused
// identically, and the checks are plain functions with no backend parameter, so opting out is not
// an option that exists to be rejected. The cost is a narrower dialect for everybody.
//
// Both are asked by the SCHEMA COMPILER and not the schema cursor, so the declaration BUILDS
// everywhere and dies once per backend when that backend compiles it.
import type { TExoSchemaCursor, TExoChildrenWiring, TExoMachineInitialState } from '@exodra/core';
import { describe, it } from 'vitest';
import { EXO_STAGE_SCHEMA_COMPILE, assertExoConformanceRule, refusesAt } from '../../index';
import { createExoTestMachine } from '@exodra/test-utils';

const textAfterARegion = () =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            b.el('div', null, (d) => {
                d.childrenPort();
                d.text('tail');
            });
            return {};
        },
        (): TExoMachineInitialState<TExoChildrenWiring> => () => undefined
    );

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
    it('static text after a children port is refused by all four, at the same layer', () => {
        assertExoConformanceRule({
            name: 'a <div> holding a children port followed by static text',
            subject: () => ({ component: textAfterARegion() }),
            expect: {
                // Its own limit: the region has no container, so it is anchored on the next static
                // element and its rows would land after the text.
                dom: refusesAt(EXO_STAGE_SCHEMA_COMPILE),
                string: refusesAt(EXO_STAGE_SCHEMA_COMPILE),
                term: refusesAt(EXO_STAGE_SCHEMA_COMPILE),
                // Reached through the two schema compilers this adapter runs; it adopts their
                // output and so could have no third answer.
                hydrate: refusesAt(EXO_STAGE_SCHEMA_COMPILE),
            },
            agreement: [],
        });
    });

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
