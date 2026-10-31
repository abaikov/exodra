// @vitest-environment jsdom
//
// Three ways the harness could silently stop meaning anything: a capability declared with a TYPO
// matches no rule, so every rule needing it routes to CANNOT-EXPRESS for the wrong backend; one
// declared but NOT TRUE gets the backend run for every rule that needs it; and TWO ADAPTERS WITH
// ONE NAME make a rule's `expect` ambiguous while the completeness gate, comparing sorted key
// lists, still passes. That a backend DECLARING a capability has it cannot be checked here:
// `fire('click')` with no listener does nothing and throws nothing, so there is no negative test.
import { describe, expect, it } from 'vitest';
import type { TExoSchemaCursor, TExoChildrenWiring, TExoMachineInitialState } from '@exodra/core';
import {
    EXO_CAP_LIVE_TREE,
    EXO_CAP_TEXT_NODE,
    EXO_CONFORMANCE_CAPABILITIES,
    exoConformanceTrees,
} from '../index';
import { createExoTestMachine } from '@exodra/test-utils';

const TRIVIAL = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        b.el('p', null, (p) => {
            p.text('hello');
        });
        return {};
    },
    (): TExoMachineInitialState<TExoChildrenWiring> => () => undefined
);

describe('the conformance registry', () => {
    it('gives every backend a distinct name', () => {
        const names = exoConformanceTrees.map((adapter) => adapter.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('declares only capabilities that exist', () => {
        for (const adapter of exoConformanceTrees) {
            for (const capability of adapter.can) {
                expect(
                    EXO_CONFORMANCE_CAPABILITIES.includes(
                        capability as (typeof EXO_CONFORMANCE_CAPABILITIES)[number]
                    ),
                    `${adapter.pkg} declares "${capability}", which is not a capability`
                ).toBe(true);
            }
        }
    });

    it('renders the trivial component on every backend that says it can', () => {
        // The floor: a backend that cannot render one paragraph is failing to start, and a rule
        // would record that as a refusal about its own subject.
        for (const adapter of exoConformanceTrees) {
            adapter.compile(TRIVIAL);
            const run = adapter.render(TRIVIAL, 1);
            try {
                expect(run.sketch([]), `${adapter.pkg} rendered nothing`).toBe('p\n  "hello"');
            } finally {
                run.dispose();
            }
        }
    });

    it('makes the two checkable absences fail when they are exercised', () => {
        // A declaration nothing could falsify is a comment; these two make the two absences facts.
        for (const adapter of exoConformanceTrees) {
            const run = adapter.render(TRIVIAL, 1);
            try {
                if (!adapter.can.has(EXO_CAP_LIVE_TREE)) {
                    expect(
                        () => run.fire('click'),
                        `${adapter.pkg} says it has no live tree and answered fire() anyway`
                    ).toThrow();
                }
                if (!adapter.can.has(EXO_CAP_TEXT_NODE)) {
                    expect(
                        () => run.translate(),
                        `${adapter.pkg} says it has no text node and answered translate() anyway`
                    ).toThrow();
                }
            } finally {
                run.dispose();
            }
        }
    });
});
