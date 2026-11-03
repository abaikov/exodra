// THE FLAT DESCRIPTION — a program assembled BY HAND, written with no builder anywhere, which is what
// a benchmark, a plugin or a host that is not a enode holds.
//
// A hand-assembled node carries its own named fields AND the two members `TExoCommitNode` asks
// for: `state`, because the PENDING WORD is a row of it (`pendingRow` says which), and `set`,
// because that is the ONE door a derivation's result leaves by. Everything else is what it always
// was: a mask per field, a walk over set bits, and bodies numbered above every derivation.
//
// `set` AND NOT A TABLE-AND-WRITE PAIR, and that is the change this file records. Those were two
// fields copied onto a wrapper object per instance, and the write behind them left NO FILL RECORD —
// so a port a derivation filled during the wire was swept back to the prototype behind it. There is
// one object and one door now, and the record is what `written` asserts below.
//
// WHAT IS NOT HERE, and it is a deletion rather than a gap: the two mount doors, the fill mask and
// the shared empty stop array. A body owns nothing — a stop belongs to the ENGINE'S `m.effect`, and
// `machine/exo-machine.test.ts` is where ownership, re-establishment and teardown are asserted.
import { describe, expect, it } from 'vitest';
import { EXO_MACHINE_LIMIT } from '../../transitions/constants/EXO_MACHINE_LIMIT';
import { exoTransition } from '../../transitions/exoTransition';
import { compileExoMachine } from '../compileExoMachine';
import { exoComputed } from '../../computed/exoComputed';
import { exoBody } from '../../lifecycle/exoBody';
import { exoFieldBit } from '../../fields/exoFieldBit';
import { EXO_HOLD_VOCABULARY } from '../../wiring/constants/EXO_HOLD_VOCABULARY';
import { exoMachineField } from '../../fields/exoMachineField';
import { fillExoMachineDerivations } from '../../fields/fillExoMachineDerivations';
import { composeExoPlugins } from '@exodra/core';
import { runExoMachineSlots } from '../runExoMachineSlots';
import { createExoTextPort } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoFillDoors, TExoTextPort } from '@exodra/core';
import type { TExoCommitNode } from '../../computed/types/TExoCommitNode';
import type { TExoHoldApi } from '../../wiring/types/TExoHoldApi';
import type { TExoMachineDerivation } from '../types/TExoMachineDerivation';
import type { TExoMachineBody } from '../types/TExoMachineBody';
import type { TExoMachineField } from '../../fields/types/TExoMachineField';
import type { TExoMachineProgram } from '../types/TExoMachineProgram';

const portAt = (index: number): TExoTextPort => createExoTextPort(index);

/** WHERE EVERY PROGRAM IN THIS FILE KEEPS ITS PENDING WORD. */
const PENDING = 0;

/**
 * THE SERVICE HALF OF A HOST — where a hand-assembled node's port writes land. Every node below
 * takes one as its prototype, so `set` is shared and the recording is the host's rather than each
 * instance's.
 *
 * `onTeardown` is here and is never called. A body owns nothing, and a door that exists and stays untouched
 * is what says so.
 *
 * IT COMPOSES `EXO_HOLD_VOCABULARY`, which is what makes `enode.hold(…)` reachable at all: batching is a
 * method a host opts into, not a function every host has.
 */
class ExoRecordingPorts implements TExoFillDoors {
    readonly fills: (readonly [number, unknown])[] = [];
    readonly written: number[] = [];
    readonly owned: (() => void)[] = [];

    constructor() {
        composeExoPlugins(this, EXO_HOLD_VOCABULARY);
    }

    // A RECORDER: it notes the fill, not which door carried it. The machine picks the door.
    private record(index: number, value: unknown): void {
        this.written.push(index);
        this.fills.push([index, value]);
    }

    text(port: TExoTextPort, value: unknown): void {
        this.record(port.index, value);
    }

    attr(port: TExoAttrPort, value: unknown): void {
        this.record(port.index, value);
    }

    unsafeHtml(port: TExoChildrenPort, markup: unknown): void {
        this.record(port.index, markup);
    }

    onTeardown(off: () => void): void {
        this.owned.push(off);
    }
}

interface TTagState extends TExoCommitNode, TExoHoldApi {
    name: string;
    open: boolean;
    width: number;
    note: number;
}

const NAME = exoMachineField<TTagState, string>(0, (s) => s.name);
const OPEN = exoMachineField<TTagState, boolean>(1, (s) => s.open);
const WIDTH = exoMachineField<TTagState, number>(2, (s) => s.width);
const NOTE_FIELD = 3;

const P_LABEL = portAt(0);
const P_SIZE = portAt(1);

const TAG = compileExoMachine<TTagState>({
    fields: 4,
    pendingRow: PENDING,
    derivations: [
        exoComputed({
            label: 'label',
            reads: [NAME, OPEN],
            into: P_LABEL,
            compute: (name, open) => (open ? name : name.slice(0, 3)),
        }),
        exoComputed({
            label: 'size',
            reads: [WIDTH],
            into: P_SIZE,
            compute: (width) => `${width}px`,
        }),
    ],
});

const M_NAME = TAG.fieldMarks[0];
const M_OPEN = TAG.fieldMarks[1];
const M_WIDTH = TAG.fieldMarks[2];
const M_NOTE = TAG.fieldMarks[NOTE_FIELD];

/** The pending word of a hand-assembled node, read and written where the program says. */
const pendingOf = (enode: TExoCommitNode): number => enode.managedState[PENDING] as number;
const mark = (enode: TExoCommitNode, bits: number): void => {
    enode.managedState[PENDING] = (enode.managedState[PENDING] as number) | bits;
};

const applyName = (s: TTagState, name: string): void => {
    s.name = name;
    mark(s, M_NAME);
};
const setName = exoTransition<TTagState, string>(TAG, applyName);
const setNameAndOpen = exoTransition<TTagState, string, boolean>(TAG, (s, name, open) => {
    s.name = name;
    mark(s, M_NAME);
    s.open = open;
    mark(s, M_OPEN);
});
const applyWidth = (s: TTagState, width: number): void => {
    s.width = width;
    mark(s, M_WIDTH);
};
const setWidth = exoTransition<TTagState, number>(TAG, applyWidth);
const setNote = exoTransition<TTagState, number>(TAG, (s, note) => {
    s.note = note;
    mark(s, M_NOTE);
});
const toggleOpen = exoTransition<TTagState>(TAG, (s) => {
    s.open = s.open === true ? false : true;
    mark(s, M_OPEN);
});

/**
 * THE WHOLE OF WHAT A MOUNT IS NOW — the derivations once, then the body slots through the pending
 * word. It is what `ExoWiringBlock.done` performs, and going through the WORD rather than a
 * plain loop is what makes each body run exactly once however deeply a notification re-enters.
 */
function establish<TState extends TExoCommitNode>(
    program: TExoMachineProgram<TState>,
    enode: TState
): void {
    fillExoMachineDerivations(program, enode);
    if (program.bodyMask !== 0) {
        enode.managedState[program.pendingRow] = program.bodyMask;
        runExoMachineSlots(program, enode);
    }
}

function mountTag(into: ExoRecordingPorts = new ExoRecordingPorts()): {
    enode: TTagState;
    ports: ExoRecordingPorts;
} {
    const enode = {
        __proto__: into,
        name: 'Alderaan',
        open: false,
        width: 48,
        note: 0,
        managedState: [0],
    } as unknown as TTagState;
    establish(TAG, enode);
    return { enode, ports: into };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE COMPILED TABLES
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('the compiled field→slots table', () => {
    it('inverts each slot`s declared fields into the fields it reads', () => {
        expect([...TAG.fieldMarks]).toEqual([0b01, 0b01, 0b10, 0]);
        expect([...TAG.reads]).toEqual([0b011, 0b100]);
    });

    it('resolves each derivation`s port index, so a backend loop needs no port object', () => {
        expect([...TAG.portIndexes]).toEqual([0, 1]);
    });

    it('costs a program with no bodies nothing: an empty mask and no slot above the last one', () => {
        expect(TAG.bodyMask).toBe(0);
        expect(TAG.bodyBase).toBe(2);
        expect(TAG.bodies).toHaveLength(0);
    });

    it('carries the row its pending word lives in, and `-1` for chains it was compiled without', () => {
        expect(TAG.pendingRow).toBe(PENDING);
        expect(TAG.wakesRow).toBe(-1);
    });
});

describe('the initial fill', () => {
    it('runs every derivation once, in declaration order, and settles the instance', () => {
        const { enode, ports } = mountTag();
        expect(ports.fills).toEqual([
            [0, 'Ald'],
            [1, '48px'],
        ]);
        expect(pendingOf(enode)).toBe(0);
    });

    it('owns nothing and registers nothing — a stop is the engine`s, never a body`s', () => {
        const { ports } = mountTag();
        expect(ports.owned).toHaveLength(0);
    });
});

describe('what an instance IS', () => {
    it('is one object: its named fields, its own state table, and one shared write', () => {
        const ports = new ExoRecordingPorts();
        const first = mountTag(ports).enode;
        const second = mountTag(ports).enode;
        expect(Object.keys(first)).toEqual(['name', 'open', 'width', 'note', 'managedState']);
        expect(first.managedState).not.toBe(second.managedState);
        expect(first.text).toBe(second.text);
    });

    it('leaves a commit by the same `set` the initial fill left by, and by no other door', () => {
        const { enode, ports } = mountTag();
        expect(ports.written).toEqual([0, 1]);
        ports.written.length = 0;
        ports.fills.length = 0;
        setName(enode, 'Bespin');
        expect(ports.fills).toEqual([[0, 'Bes']]);
        expect(ports.written).toEqual([0]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE WALK
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('a commit runs the derivations the writes woke', () => {
    it('runs a derivation ONCE when two of its fields change together', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        setNameAndOpen(enode, 'Bespin', true);
        expect(ports.fills).toEqual([[0, 'Bespin']]);
    });

    it('takes a transition with no argument at all, and commits it too', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        toggleOpen(enode);
        expect(ports.fills).toEqual([[0, 'Alderaan']]);
    });

    it('runs only the derivations that read what changed', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        setWidth(enode, 61);
        expect(ports.fills).toEqual([[1, '61px']]);
    });

    it('does not run when an unrelated field changes, and touches no port at all', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        setNote(enode, 7);
        expect(ports.fills).toEqual([]);
        expect(pendingOf(enode)).toBe(0);
    });

    it('runs two different derivations when two unrelated fields change in one hold', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        enode.hold(TAG, (s) => {
            applyName(s, 'Bespin');
            applyWidth(s, 61);
        });
        expect(ports.fills).toEqual([
            [0, 'Bes'],
            [1, '61px'],
        ]);
    });
});

describe('a derivation is handed the fields it declared, and nothing else', () => {
    it('passes them in the declared order, at every arity the binder spells out and past it', () => {
        interface TWideState extends TExoCommitNode {
            a: number;
            b: number;
            c: number;
            d: number;
            e: number;
            f: number;
        }
        const fields: TExoMachineField<TWideState, number>[] = [
            exoMachineField<TWideState, number>(0, (s) => s.a),
            exoMachineField<TWideState, number>(1, (s) => s.b),
            exoMachineField<TWideState, number>(2, (s) => s.c),
            exoMachineField<TWideState, number>(3, (s) => s.d),
            exoMachineField<TWideState, number>(4, (s) => s.e),
            exoMachineField<TWideState, number>(5, (s) => s.f),
        ];
        const seen: unknown[][] = [];
        const derivations: TExoMachineDerivation<TWideState>[] = [];
        for (let n = 1; n <= 6; n++) {
            derivations.push({
                label: `of ${n}`,
                reads: fields.slice(0, n),
                into: portAt(n - 1),
                compute: ((...args: number[]) => {
                    seen.push(args);
                    return args.join(',');
                }) as unknown as (...values: never[]) => unknown,
            });
        }
        const program = compileExoMachine<TWideState>({
            fields: 6,
            pendingRow: PENDING,
            derivations: derivations,
        });
        const enode = {
            __proto__: new ExoRecordingPorts(),
            a: 1,
            b: 2,
            c: 3,
            d: 4,
            e: 5,
            f: 6,
            managedState: [0],
        } as unknown as TWideState;
        establish(program, enode);
        expect(seen).toEqual([
            [1],
            [1, 2],
            [1, 2, 3],
            [1, 2, 3, 4],
            [1, 2, 3, 4, 5],
            [1, 2, 3, 4, 5, 6],
        ]);
    });

    it('reuses the buffer past four reads without carrying stale values between commits', () => {
        interface TWideState extends TExoCommitNode {
            a: number;
            b: number;
            c: number;
            d: number;
            e: number;
        }
        const fields = [
            exoMachineField<TWideState, number>(0, (s) => s.a),
            exoMachineField<TWideState, number>(1, (s) => s.b),
            exoMachineField<TWideState, number>(2, (s) => s.c),
            exoMachineField<TWideState, number>(3, (s) => s.d),
            exoMachineField<TWideState, number>(4, (s) => s.e),
        ];
        const seen: unknown[][] = [];
        const program = compileExoMachine<TWideState>({
            fields: 5,
            pendingRow: PENDING,
            derivations: [
                {
                    label: 'five',
                    reads: fields,
                    into: P_LABEL,
                    compute: ((...args: number[]) => {
                        seen.push(args.slice());
                        return args.join(',');
                    }) as unknown as (...values: never[]) => unknown,
                },
            ],
        });
        const enode = {
            __proto__: new ExoRecordingPorts(),
            a: 1,
            b: 2,
            c: 3,
            d: 4,
            e: 5,
            managedState: [0],
        } as unknown as TWideState;
        establish(program, enode);
        const bump = exoTransition<TWideState, number>(program, (s, v) => {
            s.e = v;
            mark(s, program.fieldMarks[4]);
        });
        bump(enode, 50);
        expect(seen).toEqual([
            [1, 2, 3, 4, 5],
            [1, 2, 3, 4, 50],
        ]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════════════════

interface TChainState extends TExoCommitNode {
    raw: string;
    visible: string;
}

function chained(): {
    program: TExoMachineProgram<TChainState>;
    ran: string[];
    make: (into: ExoRecordingPorts) => TChainState;
} {
    const ran: string[] = [];
    const RAW = exoMachineField<TChainState, string>(
        0,
        (s) => s.raw,
        (s, v) => {
            s.raw = v;
        }
    );
    const VISIBLE = exoMachineField<TChainState, string>(
        1,
        (s) => s.visible,
        (s, v) => {
            s.visible = v;
        }
    );
    const program = compileExoMachine<TChainState>({
        fields: 2,
        pendingRow: PENDING,
        derivations: [
            exoComputed({
                label: 'visible',
                reads: [RAW],
                into: VISIBLE,
                compute: (raw) => {
                    ran.push('upstream');
                    return raw.trim();
                },
            }),
            exoComputed({
                label: 'label',
                reads: [VISIBLE],
                into: P_LABEL,
                compute: (visible) => {
                    ran.push('downstream');
                    return visible;
                },
            }),
        ],
    });
    return {
        program,
        ran,
        make: (into): TChainState => {
            const enode = {
                __proto__: into,
                raw: '  Alderaan  ',
                visible: '',
                managedState: [0],
            } as unknown as TChainState;
            establish(program, enode);
            return enode;
        },
    };
}

describe('a chained derivation', () => {
    it('runs AFTER the derivation whose stored value it reads, in the SAME commit', () => {
        const c = chained();
        const ports = new ExoRecordingPorts();
        const enode = c.make(ports);
        c.ran.length = 0;
        ports.fills.length = 0;
        const setRaw = exoTransition<TChainState, string>(c.program, (s, v) => {
            s.raw = v;
            mark(s, c.program.fieldMarks[0]);
        });
        setRaw(enode, '  Bespin  ');
        expect(c.ran).toEqual(['upstream', 'downstream']);
        expect(ports.fills).toEqual([[0, 'Bespin']]);
    });

    it('does not run the upstream one when only the downstream one`s own field changes', () => {
        const c = chained();
        const enode = c.make(new ExoRecordingPorts());
        c.ran.length = 0;
        const setVisible = exoTransition<TChainState, string>(c.program, (s, v) => {
            s.visible = v;
            mark(s, c.program.fieldMarks[1]);
        });
        setVisible(enode, 'Direct');
        expect(c.ran).toEqual(['downstream']);
    });

    it('is filled in order at the mount, so the downstream one sees the stored value', () => {
        const c = chained();
        const ports = new ExoRecordingPorts();
        c.make(ports);
        expect(c.ran).toEqual(['upstream', 'downstream']);
        expect(ports.fills).toEqual([[0, 'Alderaan']]);
    });

    it('refuses a spec whose order is not topological', () => {
        const A = exoMachineField<TChainState, string>(
            0,
            (s) => s.raw,
            (s, v) => {
                s.raw = v;
            }
        );
        const B = exoMachineField<TChainState, string>(
            1,
            (s) => s.visible,
            (s, v) => {
                s.visible = v;
            }
        );
        expect(() =>
            compileExoMachine<TChainState>({
                fields: 2,
                pendingRow: PENDING,
                derivations: [
                    exoComputed({
                        label: 'downstream',
                        reads: [B],
                        into: P_LABEL,
                        compute: (b) => b,
                    }),
                    exoComputed({
                        label: 'upstream',
                        reads: [A],
                        into: B,
                        compute: (a) => a,
                    }),
                ],
            })
        ).toThrow(/not topological/);
    });

    it('refuses a derivation that stores into a field it reads itself', () => {
        const A = exoMachineField<TChainState, string>(
            0,
            (s) => s.raw,
            (s, v) => {
                s.raw = v;
            }
        );
        expect(() =>
            compileExoMachine<TChainState>({
                fields: 2,
                pendingRow: PENDING,
                derivations: [
                    exoComputed({
                        label: 'itself',
                        reads: [A],
                        into: A,
                        compute: (a) => a,
                    }),
                ],
            })
        ).toThrow(/not topological/);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// BODY SLOTS
// ═══════════════════════════════════════════════════════════════════════════════════════════

interface TBodyState extends TExoCommitNode, TExoHoldApi {
    key: number;
    other: number;
}

function withBody(
    pick: (
        KEY: TExoMachineField<TBodyState, number>,
        OTHER: TExoMachineField<TBodyState, number>
    ) => TExoMachineField<TBodyState, unknown>[]
): {
    program: TExoMachineProgram<TBodyState>;
    ran: number[];
    make: (into: ExoRecordingPorts) => TBodyState;
    KEY: TExoMachineField<TBodyState, number>;
    OTHER: TExoMachineField<TBodyState, number>;
} {
    const KEY = exoMachineField<TBodyState, number>(0, (s) => s.key);
    const OTHER = exoMachineField<TBodyState, number>(1, (s) => s.other);
    const ran: number[] = [];
    const bodies: TExoMachineBody<TBodyState>[] = [
        exoBody<TBodyState>({
            label: 'body',
            reads: pick(KEY, OTHER),
            start: (s) => {
                ran.push(s.key);
            },
        }),
    ];
    const program = compileExoMachine<TBodyState>({
        fields: 2,
        pendingRow: PENDING,
        derivations: [
            exoComputed({
                label: 'label',
                reads: [KEY],
                into: P_LABEL,
                compute: (key) => `${key}`,
            }),
        ],
        bodies: bodies,
    });
    return {
        program,
        ran,
        KEY,
        OTHER,
        make: (into): TBodyState => {
            const enode = {
                __proto__: into,
                key: 1,
                other: 0,
                managedState: [0],
            } as unknown as TBodyState;
            establish(program, enode);
            return enode;
        },
    };
}

describe('a body slot', () => {
    it('is numbered above every derivation, in one pending word, and marks the fields it reads', () => {
        const keyed = withBody((KEY) => [KEY]);
        expect(keyed.program.bodyBase).toBe(1);
        expect(keyed.program.bodyMask).toBe(0b10);
        expect([...keyed.program.fieldMarks]).toEqual([0b11, 0]);
    });

    it('runs at the mount, after every derivation, and again when a declared field moves', () => {
        const keyed = withBody((KEY) => [KEY]);
        const enode = keyed.make(new ExoRecordingPorts());
        expect(keyed.ran).toEqual([1]);

        const setKey = exoTransition<TBodyState, number>(keyed.program, (s, v) => {
            s.key = v;
            mark(s, keyed.program.fieldMarks[0]);
        });
        setKey(enode, 2);
        expect(keyed.ran).toEqual([1, 2]);
    });

    it('does not run when a field it did not declare changes', () => {
        const keyed = withBody((KEY) => [KEY]);
        const enode = keyed.make(new ExoRecordingPorts());
        const setOther = exoTransition<TBodyState, number>(keyed.program, (s, v) => {
            s.other = v;
            mark(s, keyed.program.fieldMarks[1]);
        });
        setOther(enode, 9);
        expect(keyed.ran).toEqual([1]);
    });

    it('runs after every derivation of the same commit, not interleaved with them', () => {
        const order: string[] = [];
        const KEY = exoMachineField<TBodyState, number>(0, (s) => s.key);
        const program = compileExoMachine<TBodyState>({
            fields: 2,
            pendingRow: PENDING,
            derivations: [
                exoComputed({
                    label: 'label',
                    reads: [KEY],
                    into: P_LABEL,
                    compute: (key) => {
                        order.push('derive');
                        return `${key}`;
                    },
                }),
            ],
            bodies: [
                exoBody<TBodyState>({
                    label: 'body',
                    reads: [KEY],
                    start: () => {
                        order.push('body');
                    },
                }),
            ],
        });
        const enode = {
            __proto__: new ExoRecordingPorts(),
            key: 1,
            other: 0,
            managedState: [0],
        } as unknown as TBodyState;
        establish(program, enode);
        order.length = 0;
        const setKey = exoTransition<TBodyState, number>(program, (s, v) => {
            s.key = v;
            mark(s, program.fieldMarks[0]);
        });
        setKey(enode, 2);
        expect(order).toEqual(['derive', 'body']);
    });

    it('reads nothing and is therefore in NO field`s marks — run once, unwakeable after', () => {
        const b = withBody(() => []);
        const enode = b.make(new ExoRecordingPorts());
        expect(b.ran).toEqual([1]);
        expect([...b.program.fieldMarks]).toEqual([0b1, 0]);
        const setKey = exoTransition<TBodyState, number>(b.program, (s, v) => {
            s.key = v;
            mark(s, b.program.fieldMarks[0]);
        });
        setKey(enode, 2);
        setKey(enode, 3);
        expect(b.ran).toEqual([1]);
    });

    it('is woken by a field a DERIVATION stored into, in that same commit', () => {
        const seen: string[] = [];
        const RAW = exoMachineField<TChainState, string>(
            0,
            (s) => s.raw,
            (s, v) => {
                s.raw = v;
            }
        );
        const VISIBLE = exoMachineField<TChainState, string>(
            1,
            (s) => s.visible,
            (s, v) => {
                s.visible = v;
            }
        );
        const program = compileExoMachine<TChainState>({
            fields: 2,
            pendingRow: PENDING,
            derivations: [
                exoComputed({
                    label: 'visible',
                    reads: [RAW],
                    into: VISIBLE,
                    compute: (raw) => raw.trim(),
                }),
            ],
            bodies: [
                exoBody<TChainState>({
                    label: 'body',
                    reads: [VISIBLE],
                    start: (s) => seen.push(s.visible),
                }),
            ],
        });
        const enode = {
            __proto__: new ExoRecordingPorts(),
            raw: '  Alderaan  ',
            visible: '',
            managedState: [0],
        } as unknown as TChainState;
        establish(program, enode);
        seen.length = 0;
        const setRaw = exoTransition<TChainState, string>(program, (s, v) => {
            s.raw = v;
            mark(s, program.fieldMarks[0]);
        });
        setRaw(enode, '  Bespin  ');
        expect(seen).toEqual(['Bespin']);
    });

    it('runs at most once per call however deeply a body fires a transition into it', () => {
        const KEY = exoMachineField<TBodyState, number>(0, (s) => s.key);
        const ran: number[] = [];
        let reenter = true;
        const program = compileExoMachine<TBodyState>({
            fields: 2,
            pendingRow: PENDING,
            derivations: [
                exoComputed({
                    label: 'label',
                    reads: [KEY],
                    into: P_LABEL,
                    compute: (key) => `${key}`,
                }),
            ],
            bodies: [
                exoBody<TBodyState>({
                    label: 'body',
                    reads: [KEY],
                    start: (s) => {
                        ran.push(s.key);
                        if (reenter) {
                            reenter = false;
                            setKey(s, 9);
                        }
                    },
                }),
            ],
        });
        const setKey = exoTransition<TBodyState, number>(program, (s, v) => {
            s.key = v;
            mark(s, program.fieldMarks[0]);
        });
        const enode = {
            __proto__: new ExoRecordingPorts(),
            key: 1,
            other: 0,
            managedState: [0],
        } as unknown as TBodyState;
        establish(program, enode);
        expect(ran).toEqual([1, 9]);
        expect(pendingOf(enode)).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// HOLDS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('a hold', () => {
    it('holds the commit until it returns, and then runs the shared derivation once', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        enode.hold(TAG, (s) => {
            applyName(s, 'Bespin');
            s.open = true;
            mark(s, M_OPEN);
            expect(ports.fills).toEqual([]);
        });
        expect(ports.fills).toEqual([[0, 'Bespin']]);
    });

    it('does not commit early when a nested hold on the same instance returns', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        enode.hold(TAG, (s) => {
            applyName(s, 'Bespin');
            s.hold(TAG, (inner) => {
                applyWidth(inner, 61);
            });
            expect(ports.fills).toEqual([]);
        });
        expect(ports.fills).toEqual([
            [0, 'Bes'],
            [1, '61px'],
        ]);
    });

    it('names ONE instance, so two instances are two holds', () => {
        const ports = new ExoRecordingPorts();
        const first = mountTag(ports).enode;
        const second = mountTag(ports).enode;
        ports.fills.length = 0;
        first.hold(TAG, (s) => {
            applyName(s, 'Bespin');
            second.hold(TAG, (other) => applyName(other, 'Coruscant'));
            expect(ports.fills).toEqual([[0, 'Cor']]);
        });
        expect(ports.fills).toEqual([
            [0, 'Cor'],
            [0, 'Bes'],
        ]);
    });

    it('coalesces repeated writes of one field into a single run', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        enode.hold(TAG, (s) => {
            applyName(s, 'a');
            applyName(s, 'ab');
            applyName(s, 'abc');
        });
        expect(ports.fills).toEqual([[0, 'abc']]);
    });

    it('does not suppress a TRANSITION called inside it, and still coalesces its own writes', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        enode.hold(TAG, (s) => {
            setName(s, 'Bespin');
            applyWidth(s, 61);
        });
        expect(ports.fills).toEqual([
            [0, 'Bes'],
            [1, '61px'],
        ]);
    });

    it('still commits, and still releases the instance, when the body throws', () => {
        const { enode, ports } = mountTag();
        ports.fills.length = 0;
        expect(() =>
            enode.hold(TAG, (s) => {
                applyName(s, 'Bespin');
                throw new Error('body failed');
            })
        ).toThrow(/body failed/);
        expect(ports.fills).toEqual([[0, 'Bes']]);
        enode.hold(TAG, (s) => applyWidth(s, 61));
        expect(ports.fills).toEqual([
            [0, 'Bes'],
            [1, '61px'],
        ]);
    });

    it('runs a body ONCE for several writes of its field', () => {
        const keyed = withBody((KEY) => [KEY]);
        const enode = keyed.make(new ExoRecordingPorts());
        keyed.ran.length = 0;
        enode.hold(keyed.program, (s) => {
            s.key = 2;
            mark(s, keyed.program.fieldMarks[0]);
            s.key = 3;
            mark(s, keyed.program.fieldMarks[0]);
        });
        expect(keyed.ran).toEqual([3]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE CEILINGS AND THE OTHER REFUSALS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('the ceilings', () => {
    it('states the ceiling and refuses the field past it', () => {
        expect(EXO_MACHINE_LIMIT).toBe(31);
        expect(exoFieldBit(30)).toBe(1 << 30);
        expect(() => exoFieldBit(31)).toThrow(/0\.\.30/);
    });

    it('refuses a machine with more state fields than the pending integer can carry', () => {
        expect(() =>
            compileExoMachine<TTagState>({
                fields: 32,
                pendingRow: PENDING,
                derivations: [],
            })
        ).toThrow(/the ceiling is 31/);
    });

    it('refuses derivations and bodies that together exceed the ceiling', () => {
        const A = exoMachineField<TTagState, string>(0, (s) => s.name);
        const derivations: TExoMachineDerivation<TTagState>[] = [];
        for (let i = 0; i < 31; i++) {
            derivations.push(
                exoComputed({
                    label: `d${i}`,
                    reads: [A],
                    into: portAt(i),
                    compute: (name) => name,
                })
            );
        }
        expect(() =>
            compileExoMachine<TTagState>({
                fields: 1,
                pendingRow: PENDING,
                derivations: derivations,
                bodies: [
                    exoBody<TTagState>({
                        label: 'one too many',
                        reads: [A],
                        start: () => undefined,
                    }),
                ],
            })
        ).toThrow(/share one pending word/);
    });

    it('accepts exactly the ceiling, counting both kinds', () => {
        const A = exoMachineField<TTagState, string>(0, (s) => s.name);
        const derivations: TExoMachineDerivation<TTagState>[] = [];
        for (let i = 0; i < 30; i++) {
            derivations.push(
                exoComputed({
                    label: `d${i}`,
                    reads: [A],
                    into: portAt(i),
                    compute: (name) => name,
                })
            );
        }
        const program = compileExoMachine<TTagState>({
            fields: 1,
            pendingRow: PENDING,
            derivations: derivations,
            bodies: [
                exoBody<TTagState>({
                    label: 'the last slot',
                    reads: [A],
                    start: () => undefined,
                }),
            ],
        });
        expect(program.bodyBase).toBe(30);
    });
});

describe('the other refusals', () => {
    it('refuses a derivation that reads nothing, because it could never be woken', () => {
        expect(() =>
            compileExoMachine<TTagState>({
                fields: 1,
                pendingRow: PENDING,
                derivations: [
                    {
                        label: 'constant',
                        reads: [],
                        into: P_LABEL,
                        compute: () => 'x',
                    },
                ],
            })
        ).toThrow(/reads no field/);
    });

    it('refuses a field this machine did not declare, in a derivation and in a body alike', () => {
        const STRANGER = exoMachineField<TTagState, string>(5, (s) => s.name);
        expect(() =>
            compileExoMachine<TTagState>({
                fields: 2,
                pendingRow: PENDING,
                derivations: [
                    exoComputed({
                        label: 'stranger',
                        reads: [STRANGER],
                        into: P_LABEL,
                        compute: (name) => name,
                    }),
                ],
            })
        ).toThrow(/past the 2 declared/);
        expect(() =>
            compileExoMachine<TTagState>({
                fields: 2,
                pendingRow: PENDING,
                derivations: [],
                bodies: [
                    exoBody<TTagState>({
                        label: 'stranger',
                        reads: [STRANGER],
                        start: () => undefined,
                    }),
                ],
            })
        ).toThrow(/past the 2 declared/);
    });

    it('refuses a port whose schema was never closed, rather than filling slot -1 forever', () => {
        const A = exoMachineField<TTagState, string>(0, (s) => s.name);
        expect(() =>
            compileExoMachine<TTagState>({
                fields: 1,
                pendingRow: PENDING,
                derivations: [
                    exoComputed({
                        label: 'unnumbered',
                        reads: [A],
                        into: portAt(-1),
                        compute: (name) => name,
                    }),
                ],
            })
        ).toThrow(/unnumbered port/);
    });

    it('refuses a store into a field declared with no writer', () => {
        const A = exoMachineField<TTagState, string>(0, (s) => s.name);
        const NO_WRITER = exoMachineField<TTagState, boolean>(1, (s) => s.open);
        expect(() =>
            compileExoMachine<TTagState>({
                fields: 2,
                pendingRow: PENDING,
                derivations: [
                    exoComputed({
                        label: 'into a reader',
                        reads: [A],
                        into: NO_WRITER,
                        compute: (name) => name.length > 0,
                    }),
                ],
            })
        ).toThrow(/declared with no writer/);
    });

    it('refuses a store into a field this machine did not declare', () => {
        const A = exoMachineField<TTagState, string>(0, (s) => s.name);
        const STRANGER = exoMachineField<TTagState, string>(
            9,
            (s) => s.name,
            (s, v) => {
                s.name = v;
            }
        );
        expect(() =>
            compileExoMachine<TTagState>({
                fields: 2,
                pendingRow: PENDING,
                derivations: [
                    exoComputed({
                        label: 'stranger store',
                        reads: [A],
                        into: STRANGER,
                        compute: (name) => name,
                    }),
                ],
            })
        ).toThrow(/past the 2 declared/);
    });
});
