// THE ENGINE, AND NOTHING THAT DERIVES ANYTHING. Every machine in this file is UNDECORATED and this
// file imports nothing from `../computed`, so `m.field`, `m.mounted`, `m.derive`, `m.fill` and
// `m.effectOn` are unreachable here — the last test of the last describe is that refusal, asserted
// at the type checker and at run time at once. The decoration's own suite is
// `computed/with-exo-computed-machine.test.ts`.
//
// THERE IS ONE OBJECT PER INSTANCE AND IT IS THE EXONODE. A seeder, a handler and an effect are all
// handed that node, so a test reaches an instance through any of the three. `kept`, `onTeardown`,
// `inject`, `restartEffect` and `stopEffects` below are `EXO_BASE_NODE_VOCABULARY`'s REAL bodies, merged
// onto the object every node takes as its prototype: nothing here re-implements them, and the
// re-entrancy rules asserted at the bottom are therefore assertions about the shipped door.
import { describe, expect, it } from 'vitest';
import { EXO_BASE_NODE_VOCABULARY } from '../../plugins/constants/EXO_BASE_NODE_VOCABULARY';
import { EXO_NO_STATE } from '../../wiring/constants/EXO_NO_STATE';
import { exoContextToken } from '@exodra/context';
import { armExoNode } from '../armExoNode';
import { createExoMachineBuilder } from '../factories/createExoMachineBuilder';
import { stopExoEffects } from '../stopExoEffects';
import { createExoSchema } from '../../schema/factories/createExoSchema';
import { composeExoPlugins } from '../../plugins/composeExoPlugins';
import { exoContextFrame } from '@exodra/context';
import type { TExoSchemaCursor } from '../../schema/cursor/types/TExoSchemaCursor';
import type { TExoBaseNodeFields } from '../../wiring/types/TExoBaseNodeFields';
import type { TExoContextFrame } from '@exodra/context';
import type { TExoEventHandler } from '../../wiring/types/TExoEventHandler';
import type { TExoAttrPort } from '../../schema/ports/types/TExoAttrPort';
import type { TExoEventPort } from '../../schema/ports/types/TExoEventPort';
import type { TExoMachineEffect } from '../types/TExoMachineEffect';
import type { TExoMachineNode } from '../types/TExoMachineNode';

/** What the double records, held once on the backend and reached by every node through it. */
type TExoCardLog = {
    readonly fills: (readonly [number, unknown])[];
    readonly written: number[];
    readonly listeners: (readonly [number, TExoEventHandler, unknown])[];
};

type TCard = TExoBaseNodeFields & TExoMachineNode & TExoCardLog;

/**
 * THE SERVICE HALF OF A BACKEND IN MINIATURE — `set` and `on`, which is everything the engine asks
 * of a backend that the base pack does not already answer. It carries no `live`: that member is
 * asked for by `TExoComputedMachineNode` and the engine never touches it.
 */
class ExoCardBackend {
    readonly fills: (readonly [number, unknown])[] = [];
    readonly written: number[] = [];
    readonly listeners: (readonly [number, TExoEventHandler, unknown])[] = [];

    constructor() {
        composeExoPlugins(this, EXO_BASE_NODE_VOCABULARY);
    }

    attr(this: TCard, port: TExoAttrPort, value: unknown): void {
        this.written.push(port.index);
        this.fills.push([port.index, value]);
    }

    on(this: TCard, port: TExoEventPort, handler: TExoEventHandler, subject?: unknown): void {
        this.listeners.push([port.index, handler, subject]);
    }
}

/** One instance, built the way every shipped backend builds one: four fields, in one literal. */
const nodeOf = (backend: ExoCardBackend, context: TExoContextFrame | null = null): TCard =>
    ({
        __proto__: backend,
        context: context,
        disposers: null,
        state: EXO_NO_STATE,
        effectStops: null,
        transitionOverrides: null,
        serviceState: undefined,
    } as unknown as TCard);

/** What a host that is not an exonode does to end what a wire started. */
const unmount = (enode: TCard): void => {
    if (enode.effectStops !== null) stopExoEffects(enode);
    const held = enode.disposers;
    if (held === null) return;
    enode.disposers = null;
    for (let i = 0; i < held.length; i++) held[i]();
};

function buildCard(b: TExoSchemaCursor): {
    label: TExoAttrPort;
    size: TExoAttrPort;
    click: TExoEventPort;
} {
    let label!: TExoAttrPort;
    let size!: TExoAttrPort;
    let click!: TExoEventPort;
    b.el('div', null, (d) => {
        label = d.port('data-label');
        size = d.port('data-size');
        click = d.eventPort('click');
    });
    return { label, size, click };
}

type THandle = TExoMachineEffect<TCard>;

const STORE = exoContextToken<{ readonly tag: string }>('store');

function click(log: TExoCardLog): void {
    const listener = log.listeners[log.listeners.length - 1];
    const handler = listener[1];
    if (typeof handler !== 'function') throw new Error('expected a function handler');
    handler(new Event('click'), listener[2]);
}

const took = (held: readonly (TCard | null)[]): TCard => {
    const enode = held[0];
    if (enode === null) throw new Error('nothing was ever handed an instance');
    return enode;
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE ONE NUMBERING DOOR
// ═══════════════════════════════════════════════════════════════════════════════════════════

type TKept = { box: string | null; ticks: number };

describe('the one unmanaged slot', () => {
    it('REFUSES a second keep: unmanaged state is one value, not a table of them', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        m.createInitialState((): TKept => ({ box: null, ticks: 0 }));
        expect(() => m.createInitialState(() => 0)).toThrow(/called twice/);
    });

    it('is seeded ONCE PER INSTANCE, with the exonode, and never shared between two', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const K = m.createInitialState((c): TKept & { tag: string } => ({
            box: null,
            ticks: 0,
            tag: c.inject(STORE)?.tag ?? 'none',
        }));
        const CARD = m.done();

        const backend = new ExoCardBackend();
        const context = exoContextFrame(null, STORE, { tag: 'gold' });
        const first = nodeOf(backend, context);
        const second = nodeOf(backend, context);
        armExoNode(first, CARD);
        armExoNode(second, CARD);

        expect(first.readState(K)).toEqual({ box: null, ticks: 0, tag: 'gold' });
        expect(first.readState(K)).not.toBe(second.readState(K));
    });

    it('costs a component that declares none NOTHING — no object and no branch', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(enode.state).toBe(EXO_NO_STATE);
    });

    it('is written from a HANDLER with nothing to commit, because nothing wakes on it', () => {
        const schema = createExoSchema(buildCard);
        const m = createExoMachineBuilder<TCard>(schema);
        const K = m.createInitialState((): TKept => ({ box: null, ticks: 0 }));
        const seen: (TCard | null)[] = [null];
        m.on(schema.ports.click, (instance) => {
            seen[0] = instance;
            const kept = instance.readState(K);
            kept.ticks += 1;
            kept.box = 'measured';
            instance.attr(schema.ports.label, `${kept.ticks}`);
        });
        const CARD = m.done();

        const backend = new ExoCardBackend();
        armExoNode(nodeOf(backend), CARD);
        click(backend);
        click(backend);
        const enode = took(seen);
        expect(enode.readState(K)).toEqual({ box: 'measured', ticks: 2 });
        expect(backend.fills).toEqual([
            [0, '1'],
            [0, '2'],
        ]);
    });

    it('refuses a value where a seeder was asked for, which would be one object for all', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const shared = { n: 0 };
        expect(() =>
            (m.createInitialState as unknown as (make: unknown) => unknown)(shared)
        ).toThrow(/not a function/);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WHAT AN INSTANCE IS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('an instance the builder wired', () => {
    it('IS the exonode the caller handed in, and the wire adds no field to it', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const K0 = m.createInitialState(() => ({ ticks: 0 }));
        const CARD = m.done();
        const backend = new ExoCardBackend();
        const first = nodeOf(backend);
        const second = nodeOf(backend);
        armExoNode(first, CARD);
        armExoNode(second, CARD);

        expect(first.readState(K0)).toEqual({ ticks: 0 });
        expect(Object.keys(first)).toEqual([
            'context',
            'disposers',
            'state',
            'effectStops',
            'transitionOverrides',
            'serviceState',
        ]);
        expect(first.state).not.toBe(second.state);
        expect(first.attr).toBe(second.attr);
    });

    it('writes a port through `attr`, and the FILL RECORD is what that leaves behind', () => {
        const schema = createExoSchema(buildCard);
        const m = createExoMachineBuilder<TCard>(schema);
        const held: (TCard | null)[] = [null];
        m.effect((c) => {
            held[0] = c;
            return null;
        });
        const CARD = m.done();
        const backend = new ExoCardBackend();
        armExoNode(nodeOf(backend), CARD);
        took(held).attr(schema.ports.size, 'wide');
        expect(backend.fills).toEqual([[1, 'wide']]);
        expect(backend.written).toEqual([1]);
    });

    it('hands the backend DATA: a schema declaration, its forms, the wire, the effects and the handlers', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        m.createInitialState(() => 0);
        const CARD = m.done();
        expect(Object.keys(CARD).sort()).toEqual([
            'createInitialState',
            'declaration',
            'effects',
            'forms',
            'handlers',
            'wire',
        ]);
        expect((CARD as unknown as { seed?: unknown }).seed).toBeUndefined();
    });

    it('holds no disposer array at all for a component that declares no effect', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        m.createInitialState(() => 0);
        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(enode.effectStops).toBeNull();
        expect(enode.disposers).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('a declared handler', () => {
    it('is ONE function for the whole component, filled with the exonode as its subject', () => {
        const schema = createExoSchema(buildCard);
        const m = createExoMachineBuilder<TCard>(schema);
        const K = m.createInitialState(() => 'unset');
        const ran: string[] = [];
        m.on(schema.ports.click, (instance) => {
            ran.push(instance.readState(K));
        });
        const CARD = m.done();

        const backend = new ExoCardBackend();
        const alpha = nodeOf(backend);
        const beta = nodeOf(backend);
        armExoNode(alpha, CARD);
        armExoNode(beta, CARD);
        alpha.state = 'first';
        beta.state = 'second';

        expect(backend.listeners).toHaveLength(2);
        const [firstPort, firstHandler, firstSubject] = backend.listeners[0];
        const [secondPort, secondHandler, secondSubject] = backend.listeners[1];
        expect(firstPort).toBe(secondPort);
        expect(firstHandler).toBe(secondHandler);
        expect(firstSubject).not.toBe(secondSubject);
        if (typeof firstHandler !== 'function') throw new Error('expected a function handler');
        firstHandler(new Event('click'), secondSubject);
        firstHandler(new Event('click'), firstSubject);
        expect(ran).toEqual(['second', 'first']);
    });

    it('transposes the author`s (exonode, event) into the dispatcher`s (event, subject)', () => {
        const schema = createExoSchema(buildCard);
        const m = createExoMachineBuilder<TCard>(schema);
        const seenEvents: string[] = [];
        const seenInstances: (TCard | null)[] = [null];
        m.on(schema.ports.click, (instance, event) => {
            seenInstances[0] = instance;
            seenEvents.push((event as Event).type);
        });
        const CARD = m.done();
        const backend = new ExoCardBackend();
        armExoNode(nodeOf(backend), CARD);
        const [, handler, subject] = backend.listeners[0];
        if (typeof handler !== 'function') throw new Error('expected a function handler');
        handler(new Event('click'), subject);
        expect(seenEvents).toEqual(['click']);
        expect(took(seenInstances)).toBe(subject);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE SEED
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('where an instance starts', () => {
    it('takes a machine NOTHING at arming time — no seed, no props, no index', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        m.createInitialState(() => 'declared');
        const CARD = m.done();
        expect(armExoNode).toHaveLength(2);
        expect(Object.keys(CARD).sort()).toEqual([
            'createInitialState',
            'declaration',
            'effects',
            'forms',
            'handlers',
            'wire',
        ]);
    });

    it('starts at the DECLARED value, and a TRANSITION is what moves it off that', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const K = m.createInitialState(() => 'declared');
        const held: (TCard | null)[] = [null];
        m.effect((c) => {
            held[0] = c;
            return null;
        });
        const CARD = m.done();
        armExoNode(nodeOf(new ExoCardBackend()), CARD);
        expect(took(held).readState(K)).toBe('declared');
    });

    it('names ONE instance among many, so two cards are moved apart by a transition', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const K = m.createInitialState(() => 'declared');
        const move = m.transition<string>((enode, value) => {
            enode.state = value;
        });
        const CARD = m.done();
        const backend = new ExoCardBackend();
        const first = nodeOf(backend);
        const second = nodeOf(backend);
        armExoNode(first, CARD);
        armExoNode(second, CARD);
        move(second, 'moved');
        expect(first.readState(K)).toBe('declared');
        expect(second.readState(K)).toBe('moved');
    });

    it('is ARMED and NOT PLACED, which is what leaves room for the transitions', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const K = m.createInitialState(() => 0);
        const bump = m.transition((enode) => {
            enode.state = (enode.state as number) + 1;
        });
        const CARD = m.done();
        const backend = new ExoCardBackend();
        const enode = nodeOf(backend);

        armExoNode(enode, CARD);
        bump(enode);
        bump(enode);

        expect(enode.readState(K)).toBe(2);
        expect(backend.fills).toEqual([]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// EFFECTS — established at the wire, owned by the exonode, re-run through one door
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('an effect', () => {
    it('is established at the wire, in declaration order, with one stop slot each', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const ran: string[] = [];
        m.effect(() => {
            ran.push('first');
            return null;
        });
        m.effect(() => {
            ran.push('second');
            return null;
        });
        const held: (TCard | null)[] = [null];
        m.effect((c) => {
            held[0] = c;
            return () => undefined;
        });
        const CARD = m.done();
        armExoNode(nodeOf(new ExoCardBackend()), CARD);
        expect(ran).toEqual(['first', 'second']);
        expect(took(held).effectStops).toHaveLength(3);
    });

    it('registers NO teardown with the exonode: a dispose walk reads `effectStops`', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const owned: number[] = [];
        const stopped: string[] = [];
        m.effect((c) => {
            owned.push(c.disposers === null ? 0 : c.disposers.length);
            return () => {
                stopped.push('first');
            };
        });
        m.effect(() => null);
        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(owned).toEqual([0]);
        expect(enode.disposers).toBeNull();
        expect(enode.effectStops).toHaveLength(2);
        unmount(enode);
        expect(stopped).toEqual(['first']);
        expect(enode.effectStops).toBeNull();
    });

    it('is torn down LAST DECLARED FIRST, so a later effect ends before the one it stands on', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const log: string[] = [];
        m.effect(() => () => log.push('first'));
        m.effect(() => () => log.push('second'));
        m.effect(() => () => log.push('third'));
        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        unmount(enode);
        expect(log).toEqual(['third', 'second', 'first']);
    });

    it('runs every stop once, however many times the teardown is called', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const log: string[] = [];
        m.effect(() => () => log.push('off'));
        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        unmount(enode);
        enode.stopEffects();
        expect(log).toEqual(['off']);
        expect(enode.effectStops).toBeNull();
    });
});

describe('restartEffect', () => {
    it('ends the old subscription FIRST and keeps the new one', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const log: string[] = [];
        let round = 0;
        const held: (TCard | null)[] = [null];
        const handle: THandle = m.effect((c) => {
            held[0] = c;
            const at = round++;
            log.push(`start ${at}`);
            return () => log.push(`stop ${at}`);
        });
        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        took(held).restartEffect(handle);
        expect(log).toEqual(['start 0', 'stop 0', 'start 1']);
        unmount(enode);
        expect(log).toEqual(['start 0', 'stop 0', 'start 1', 'stop 1']);
    });

    it('touches no other effect`s slot', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const log: string[] = [];
        const held: (TCard | null)[] = [null];
        const first: THandle = m.effect((c) => {
            held[0] = c;
            return () => log.push('first off');
        });
        m.effect(() => () => log.push('second off'));
        const CARD = m.done();
        armExoNode(nodeOf(new ExoCardBackend()), CARD);
        took(held).restartEffect(first);
        expect(log).toEqual(['first off']);
    });

    it('keeps what a non-function start hands back out of the slot entirely', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const held: (TCard | null)[] = [null];
        m.effect((c) => {
            held[0] = c;
            return undefined as unknown as null;
        });
        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(took(held).effectStops).toEqual([null]);
        expect(() => unmount(enode)).not.toThrow();
    });

    it('establishes nothing on an exonode whose teardown has already run', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        let starts = 0;
        const held: (TCard | null)[] = [null];
        const handle: THandle = m.effect((c) => {
            held[0] = c;
            starts += 1;
            return null;
        });
        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        unmount(enode);
        enode.restartEffect(handle);
        expect(starts).toBe(1);
    });

    it('ends a stop handed back by a start that tore the exonode down mid-call', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const log: string[] = [];
        const held: (TCard | null)[] = [null];
        m.effect((c) => {
            held[0] = c;
            c.stopEffects();
            return () => log.push('late');
        });
        const CARD = m.done();
        armExoNode(nodeOf(new ExoCardBackend()), CARD);
        expect(log).toEqual(['late']);
        expect(took(held).effectStops).toBeNull();
    });

    it('ends the STALE return when its own start re-established the effect underneath it', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const log: string[] = [];
        const held: (TCard | null)[] = [null];
        let nested = false;
        const itself: THandle[] = [];
        itself.push(
            m.effect((c) => {
                held[0] = c;
                if (nested) return () => log.push('live off');
                nested = true;
                c.restartEffect(itself[0]);
                log.push('stale returning');
                return () => log.push('stale off');
            })
        );
        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(log).toEqual(['stale returning', 'stale off']);
        unmount(enode);
        expect(log).toEqual(['stale returning', 'stale off', 'live off']);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REFUSALS, AND THE CUT
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('the builder`s refusals', () => {
    it('refuses a declaration made after done()', () => {
        const schema = createExoSchema(buildCard);
        const m = createExoMachineBuilder<TCard>(schema);
        m.createInitialState(() => 0);
        m.done();
        expect(() => m.createInitialState(() => 0)).toThrow(/after done\(\)/);
        expect(() => m.effect(() => null)).toThrow(/after done\(\)/);
        expect(() => m.on(schema.ports.click, () => undefined)).toThrow(/after done\(\)/);
    });

    it('refuses a second done(), because a machine compiles once', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        m.done();
        expect(() => m.done()).toThrow(/compiles once/);
    });
});

describe('the cut between the engine and the computed system', () => {
    it('declares UNMANAGED state, manual effects, handlers and transitions — and nothing else', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        expect(Object.keys(m)).toEqual([
            'schema',
            'createInitialState',
            'effect',
            'on',
            'wire',
            'transition',
            'overrides',
            'done',
        ]);
    });

    it('makes a transition the body behind one override check: an unmanaged slot has nothing to recompute', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const K = m.createInitialState(() => 0);
        const bump = (enode: TCard, by: number): void => {
            enode.state = (enode.state as number) + by;
        };
        const tick = m.transition<number>(bump);
        expect(tick).not.toBe(bump);

        const CARD = m.done();
        const enode = nodeOf(new ExoCardBackend());
        armExoNode(enode, CARD);
        tick(enode, 3);
        tick(enode, 4);
        expect(enode.readState(K)).toBe(7);
    });

    it('refuses a transition declared after done()', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        m.done();
        expect(() => m.transition(() => undefined)).toThrow(/after done\(\)/);
    });

    it('has no `field`, and reaching for one does not compile', () => {
        const m = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        // @ts-expect-error `field` is `withExoComputedMachine`'s; the day this line compiles, the
        // extraction has been undone.
        expect(() => m.field('')).toThrow(TypeError);
    });
});
