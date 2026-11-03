import { describe, expect, it } from 'vitest';
import type { TExoMachineInitialState } from '@exodra/core';
import { buildRow, createExoTestMachine } from '@exodra/test-utils';
import { ExoStrBackend } from '@exodra/string';
import type { TExoStrMachine } from '../types/TExoStrMachine';
import type { TExoStrNode } from '../EXO_STR_NODE_VOCABULARY';

// WHAT THIS FILE PINS, AND WHY IT IS NOT THE RULE THAT WAS WRITTEN DOWN. `TExoFillDoors` promised
// that "a port is filled from the first call made during the wire" and that "a call after the wire
// records nothing", so that a backend's sweep of skipped ports could not cover a value just
// written. NOTHING RECORDS A FILL IN ANY BACKEND — `grep` finds no fill mask, no fill record and
// no sweep — and nothing sweeps, since the compiler stopped reserving placeholder attributes
// (`packages/dom/src/tests/attr-parity.test.ts` pins `<input>` where it used to pin
// `<input value="">`). On the DOM a call after the wire is THE UPDATE PATH and it writes: that is
// what `dom/src/dom/tests/attr-binding.test.ts` means by "follows the source" and "keeps
// following after a change".
//
// WHAT IS TRUE ON THE SERVER IS NARROWER AND IS THE SUBJECT HERE: the markup is built by
// `fillMarkup(node.values)` AFTER the wire returns, so a write that arrives later lands in the
// slot and changes NOTHING THAT WAS ALREADY HANDED BACK. Not because it was refused — because the
// string had been taken. A test is the only place that distinction can be stated, since both
// readings print the same bytes for the render itself.

const EXO_STR = new ExoStrBackend();

describe('a fill that arrives after the markup was taken', () => {
    it('is performed, and cannot change the string already handed back', () => {
        let escaped: TExoStrNode | null = null;
        const PORTS: { label?: unknown } = {};

        const ROW: TExoStrMachine = createExoTestMachine(
            buildRow,
            (P): TExoMachineInitialState<TExoStrNode> =>
                (c) => {
                    PORTS.label = P.label;
                    c.text(P.label, 'during');
                    // The exonode IS the instance, so a wire can keep it. Nothing stops this and
                    // nothing should: a handler on a live backend keeps exactly this reference.
                    escaped = c;
                }
        );

        const html = EXO_STR.render(ROW);
        expect(html).toContain('during');

        const node = escaped as unknown as TExoStrNode;
        node.text(PORTS.label as Parameters<TExoStrNode['text']>[0], 'after');

        // The write LANDED — the door did not refuse it and recorded no "already filled".
        expect(node.values.join('|')).toContain('after');
    });
});
