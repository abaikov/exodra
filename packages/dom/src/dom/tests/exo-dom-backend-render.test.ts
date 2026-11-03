// @vitest-environment jsdom
import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoMachine,
    TExoAttrPort,
    TExoTextPort,
    TExoEventPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoStrBackend } from '@exodra/string';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { buildRow, host, createExoTestMachine } from '@exodra/test-utils';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

/**
 * WHAT THESE WIRES ASSUME ABOUT AN EXONODE, and nothing more. Written as a method rather
 * than a property so a real exonode, whose `set` takes a `TExoPort`, satisfies it — and
 * so ONE component below can be handed to the server backend and to this one.
 */
type TSetting = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    on(port: TExoEventPort, handler: unknown, subject?: unknown): void;
};

/** The same, for the wire that builds a LIST of rows rather than filling one. */
type TListing = {
    list(port: TExoChildrenPort, component: TExoMachine<never>, params: readonly unknown[]): void;
};

type TRowPorts = ReturnType<typeof buildRow>;

/** One shape, one component per case — the wire is chosen where the case is written. */
const rowWith = (make: (ports: TRowPorts) => TExoMachineInitialState<TSetting>) =>
    createExoTestMachine(buildRow, make);

/**
 * `n` ROWS OF ONE COMPONENT, AS A LIST — and it is what every case in this file is now written
 * against, because it is what an application writes when it wants `n` of something.
 *
 * A BACKEND MOUNTS ONE INSTANCE. It takes no count, and that is on purpose: no library asks an
 * application how many copies of its root to make. What these cases were always really about is
 * SIBLINGS — rows sharing one prototype, one exonode and one schema — and `c.list` is the call
 * that makes those, handing row `i` the number `i` as its params, which is what the wires read.
 *
 * The `<ul>` is the element the children port lives on. It is printed identically by both
 * backends, so the byte-parity case still compares like with like.
 */
const listOf = <TPorts>(row: TExoMachine<TSetting, TPorts>, n: number) => {
    return createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TListing> =>
            (c) => {
                c.list(
                    P.rows,
                    row,
                    Array.from({ length: n }, (_, i) => i)
                );
            }
    );
};

describe('mounting through ExoDomBackend.render', () => {
    it('produces markup byte-identical to the string backend', () => {
        // THE GATE THIS WHOLE DESIGN RESTS ON. The two backends never speak to each other;
        // they agree because both index a schema by the port numbers `createExoSchema` assigned.
        // If that ever drifts, the symptom is not a crash but a page that hydrates into
        // nonsense, so it is checked here on every change.
        //
        // ONE COMPONENT drives both, which is stronger than it was when the schema and the
        // wire were two arguments: there is no longer a way for the string render and the
        // DOM render of this test to be given different wiring by accident.
        const ROW = rowWith((P) => (c, i) => {
            c.text(P.count, 0);
            c.attr(P.id, i);
            c.attr(P.mark, i);
            c.text(P.label, 'Item ' + i);
            c.on(P.click, () => undefined);
        });

        const LIST = listOf(ROW, 3);
        const fromString = EXO_STR.render(LIST);
        const parent = host();
        EXO_BACKEND.render(LIST, parent);

        expect(parent.innerHTML).toBe(fromString);
    });

    it('attaches the listener the server could not print', () => {
        let clicks = 0;
        const ROW = rowWith((P) => (c) => {
            c.attr(P.id, 'a');
            c.text(P.label, 'l');
            c.attr(P.mark, 'b');
            c.text(P.count, 'c');
            c.on(P.click, () => {
                clicks++;
            });
        });
        const parent = host();
        EXO_BACKEND.render(listOf(ROW, 2), parent);

        const buttons = parent.querySelectorAll('button');
        expect(buttons).toHaveLength(2);
        buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicks).toBe(1);
    });
});
