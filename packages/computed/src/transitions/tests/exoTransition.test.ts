// WHAT THIS FILE IS FOR. `exoTransition` and `exoMachineSettle` are the only two places where the
// COMPUTED system decides how much of itself to attach, and both decide it by looking at the
// program rather than at a value. Nothing covered either arm, so the cheap arm could have been
// swapped for the dear one — or the other way round — and every machine test in the package stayed
// green, because the two arms agree on every observable except WHAT RUNS.
//
// THE CLAIM THESE ARMS CARRY, and the reason they are worth a file of their own: a machine that
// declares no derivation and no body slot pays NOTHING for the system — `exoTransition` hands back
// the caller's own function, not a wrapper around it. `check:computed-shake` says the MODULES do
// not reach such a page; this says the CALL does not either.
import { describe, expect, it } from 'vitest';
import { createExoTextPort } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoFillDoors, TExoTextPort } from '@exodra/core';
import { compileExoMachine } from '../../machine/compileExoMachine';
import { exoComputed } from '../../computed/exoComputed';
import { exoBody } from '../../lifecycle/exoBody';
import { exoMachineField } from '../../fields/exoMachineField';
import { exoMachineSettle } from '../exoMachineSettle';
import { exoTransition } from '../exoTransition';
import type { TExoCommitNode } from '../../computed/types/TExoCommitNode';
import type { TExoMachineProgram } from '../../machine/types/TExoMachineProgram';

const PENDING = 0;
const P_LABEL: TExoTextPort = createExoTextPort(0);

/** Where a hand-assembled node's fills land, so a commit is observable without a backend. */
class ExoRecordingPorts implements TExoFillDoors {
    readonly fills: (readonly [number, unknown])[] = [];

    text(port: TExoTextPort, value: unknown): void {
        this.fills.push([port.index, value]);
    }

    attr(port: TExoAttrPort, value: unknown): void {
        this.fills.push([port.index, value]);
    }

    unsafeHtml(port: TExoChildrenPort, markup: unknown): void {
        this.fills.push([port.index, markup]);
    }

    onTeardown(): void {}
}

interface TCountState extends TExoCommitNode {
    count: number;
}

const COUNT = exoMachineField<TCountState, number>(0, (s) => s.count);

const nodeOf = (ports: ExoRecordingPorts): TCountState =>
    ({ __proto__: ports, count: 1, managedState: [0] } as unknown as TCountState);

const mark = (enode: TExoCommitNode, bits: number): void => {
    enode.managedState[PENDING] = (enode.managedState[PENDING] as number) | bits;
};

/** No derivation and no body: the shape an imperative component compiles to. */
const IMPERATIVE: TExoMachineProgram<TCountState> = compileExoMachine<TCountState>({
    fields: 1,
    pendingRow: PENDING,
    derivations: [],
});

const DERIVING: TExoMachineProgram<TCountState> = compileExoMachine<TCountState>({
    fields: 1,
    pendingRow: PENDING,
    derivations: [
        exoComputed({
            label: 'label',
            reads: [COUNT],
            into: P_LABEL,
            compute: (count) => `${count}`,
        }),
    ],
});

describe('exoTransition — the arm an imperative machine takes', () => {
    it('hands back the CALLER’S OWN FUNCTION when there is nothing to settle', () => {
        const apply = (s: TCountState, v: number): void => {
            s.count = v;
        };
        expect(exoTransition<TCountState, number>(IMPERATIVE, apply)).toBe(apply);
    });

    it('writes nothing to any port, because no derivation exists to write one', () => {
        const ports = new ExoRecordingPorts();
        const enode = nodeOf(ports);
        const bump = exoTransition<TCountState, number>(IMPERATIVE, (s, v) => {
            s.count = v;
            mark(s, IMPERATIVE.fieldMarks[0]);
        });
        bump(enode, 7);
        expect(enode.count).toBe(7);
        expect(ports.fills).toEqual([]);
    });
});

describe('exoTransition — the arm a deriving machine takes', () => {
    it('wraps the function rather than returning it', () => {
        const apply = (s: TCountState, v: number): void => {
            s.count = v;
        };
        expect(exoTransition<TCountState, number>(DERIVING, apply)).not.toBe(apply);
    });

    it('applies first and settles after, so the port carries the value the apply left', () => {
        const ports = new ExoRecordingPorts();
        const enode = nodeOf(ports);
        const bump = exoTransition<TCountState, number>(DERIVING, (s, v) => {
            s.count = v;
            mark(s, DERIVING.fieldMarks[0]);
        });
        bump(enode, 4);
        expect(ports.fills).toEqual([[0, '4']]);
    });

    it('settles nothing when the apply marked no field', () => {
        const ports = new ExoRecordingPorts();
        const enode = nodeOf(ports);
        const touch = exoTransition<TCountState>(DERIVING, (s) => {
            s.count = 9;
        });
        touch(enode);
        expect(ports.fills).toEqual([]);
    });

    it('accepts the DECLARED form — an object carrying the program — as well as the program', () => {
        const apply = (s: TCountState): void => {
            s.count = 2;
        };
        expect(exoTransition<TCountState>({ program: IMPERATIVE }, apply)).toBe(apply);
        expect(exoTransition<TCountState>({ program: DERIVING }, apply)).not.toBe(apply);
    });
});

describe('exoMachineSettle — the body arm', () => {
    it('commits and runs no slot when the program has no body', () => {
        const ports = new ExoRecordingPorts();
        const enode = nodeOf(ports);
        mark(enode, DERIVING.fieldMarks[0]);
        exoMachineSettle(DERIVING)(enode);
        expect(ports.fills).toEqual([[0, '1']]);
    });

    it('runs the body AFTER the commit when the program has one', () => {
        const seen: string[] = [];
        const withBody = compileExoMachine<TCountState>({
            fields: 1,
            pendingRow: PENDING,
            derivations: [
                exoComputed({
                    label: 'label',
                    reads: [COUNT],
                    into: P_LABEL,
                    compute: (count) => {
                        seen.push(`derive:${count}`);
                        return `${count}`;
                    },
                }),
            ],
            bodies: [
                exoBody<TCountState>({
                    label: 'body',
                    reads: [COUNT],
                    start: (s) => {
                        seen.push(`body:${s.count}`);
                    },
                }),
            ],
        });
        expect(withBody.bodyMask).not.toBe(0);

        const enode = nodeOf(new ExoRecordingPorts());
        enode.count = 3;
        mark(enode, withBody.fieldMarks[0]);
        exoMachineSettle(withBody)(enode);
        expect(seen).toEqual(['derive:3', 'body:3']);
    });
});
