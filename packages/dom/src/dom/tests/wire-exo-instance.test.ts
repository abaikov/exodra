// @vitest-environment jsdom
import type {
    TExoSchemaCursor,
    TExoChildrenWiring,
    TExoChildrenPort,
    TExoMachine,
    TExoWiring,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

/**
 * WHAT A THROWING WIRE LEAVES BEHIND — and the answer is now "nothing", structurally.
 *
 * A schema used to carry a stack of per-depth scratch frames: each fill wrote its port index into
 * the frame so the unfilled-port sweep could tell what the wire had skipped. A wire that threw
 * left its slot claimed, so an error boundary re-rendering a route added ONE FRAME PER FAILED
 * RENDER for the life of the page, and a `try/finally` on the hottest function in the package was
 * what held it. The sweep is gone — nothing records a fill, so there is no stack, no depth counter
 * and no bracket to get wrong.
 *
 * What survives is the claim a user can see, and it is what the case below asserts: a render may
 * throw, and the next render of the same schema must still produce exactly the tree it should.
 */

function buildBox(b: TExoSchemaCursor) {
    let label!: TExoTextPort;
    b.el('div', { class: 'box' }, (d) => {
        d.el('span', { class: 'label' }, (s) => {
            label = s.textPort();
        });
    });
    return { label };
}

type TBoxPorts = ReturnType<typeof buildBox>;

const boxWith = (
    make: (ports: TBoxPorts) => TExoMachineInitialState<TExoWiring>
): TExoMachine<TExoWiring> => createExoTestMachine(buildBox, make);

/**
 * `n` BOXES AS A LIST — the only way to put several instances of one component on a page, and the
 * shape the cases below need for a reason of their own: the claim is about SIBLINGS at the same
 * depth of one schema's wire-frame stack, and `c.list` is what mounts them there. It hands box `i`
 * the number `i` as its params, which is what these wires read as `i`.
 */
const listOf = (component: TExoMachine<TExoWiring>, n: number): TExoMachine<TExoChildrenWiring> => {
    return createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let boxes!: TExoChildrenPort;
            b.el('div', { class: 'boxes' }, (d) => {
                boxes = d.childrenPort();
            });
            return { boxes };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.list(
                    P.boxes,
                    component,
                    Array.from({ length: n }, (_, i) => i)
                );
            }
    );
};

describe('wireExoInstance and the wire-frame stack', () => {
    it('renders correctly after a failed render — a reused frame carries nothing over', () => {
        // The old bug was memory, not wrong output, and that distinction is why it survived
        // being described as "one stranded slot". This pins the other half: now that the slot IS
        // returned, the next render reuses the same frame and must still produce exactly the tree
        // it should.
        const items = ['a', 'b'];
        const FLAKY = boxWith((P) => (c, i) => {
            if (i === 0 && items.length === 2) {
                items.pop();
                throw new Error('first attempt fails');
            }
            c.text(P.label, 'row ' + i);
        });
        const parent = host();

        expect(() => EXO_BACKEND.render(FLAKY, parent, 0)).toThrow('first attempt fails');
        parent.innerHTML = '';
        EXO_BACKEND.render(listOf(FLAKY, 2), parent);

        expect(parent.querySelectorAll('.box').length).toBe(2);
        expect(parent.textContent).toBe('row 0row 1');
    });
});
