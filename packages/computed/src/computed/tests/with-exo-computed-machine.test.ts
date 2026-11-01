// THE DECORATION — what `withExoComputedMachine` adds to a built machine, and what it adds to an
// EXONODE, which is rows of `managedState` and not fields.
//
//   NUMBERING     a field's address continues the SCHEMA's port numbering; its ROW is a slot of
//                 `TExoBaseNodeFields.managedState`, which this decoration seeds. There is no index,
//                 no reader, no count and no mark anywhere here for an author to have got wrong,
//                 which is the claim.
//   ARGUMENTS     a derivation's parameter list IS its dependency list.
//   CHAINS        a derivation whose ADDRESS is a state field wakes what reads that field.
//   `m.fill`      a slot handed the EXONODE, which writes by CALLING — what a children port needs.
//   `m.effectOn`  the engine's effect plus a wake set, re-established through `enode.restartEffect`.
//   `mounted`     an ordinary field, false during the wire and true once the instance goes live.
//   THE DEBITS    the stop array a decorated component allocates even with no author effect, and
//                 the dispose order that puts `mounted → false` after every effect the author wrote.
//
// EVERY FILL GOES THROUGH `c.set` AND THEREFORE LEAVES A FILL RECORD. A fill through a record-free
// door is one a backend's sweep puts the prototype back over, wiping what a derivation had just
// written — so `written` is asserted beside `fills` wherever the wire fills a port.
//
// The ENGINE under it is `packages/core/src/machine/tests/exo-machine.test.ts`, and nothing here
// re-tests it.
import { describe, expect, it } from 'vitest';
import {
    EXO_BASE_NODE_VOCABULARY,
    EXO_NO_STATE,
    createExoMachineBuilder,
    createExoSchema,
    composeExoPlugins,
} from '@exodra/core';
import { exoContextToken, exoContextFrame } from '@exodra/context';
import { armExoNode, stopExoEffects } from '@exodra/core';
import { exoTransition } from '../../transitions/exoTransition';
import { EXO_HOLD_VOCABULARY } from '../../wiring/constants/EXO_HOLD_VOCABULARY';
import { withExoComputedMachine } from '../withExoComputedMachine';
import type {
    TExoSchemaCursor,
    TExoBaseNodeFields,
    TExoEventHandler,
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoTextPort,
    TExoCursorDeclaration,
} from '@exodra/core';
import type { TExoContextFrame } from '@exodra/context';
import type { TExoComputedLive } from '../types/TExoComputedLive';
import type { TExoComputedMachineNode } from '../types/TExoComputedMachineNode';
import type { TExoHoldApi } from '../../wiring/types/TExoHoldApi';
import type { TExoMachineFieldHandle } from '../../fields/types/TExoMachineFieldHandle';

/** What the double records, held once on the backend and reached by every node through it. */
type TExoCardLog = {
    readonly fills: (readonly [number, unknown])[];
    readonly written: number[];
    readonly listeners: (readonly [number, TExoEventHandler, unknown])[];
};

type TCard = TExoBaseNodeFields & TExoComputedMachineNode & TExoCardLog & TExoHoldApi;

/**
 * The service half of a backend in miniature, over `EXO_BASE_NODE_VOCABULARY`'s real bodies — and over
 * `EXO_HOLD_VOCABULARY`'s, which is what a page that batches composes and a page that does not never
 * links.
 */
class ExoCardBackend {
    readonly fills: (readonly [number, unknown])[] = [];
    readonly written: number[] = [];
    readonly listeners: (readonly [number, TExoEventHandler, unknown])[] = [];

    constructor() {
        composeExoPlugins(this, EXO_BASE_NODE_VOCABULARY, EXO_HOLD_VOCABULARY);
    }

    attr(this: TCard, port: TExoAttrPort, value: unknown): void {
        this.written.push(port.index);
        this.fills.push([port.index, value]);
    }

    text(this: TCard, port: TExoTextPort, value: unknown): void {
        this.attr(port as unknown as TExoAttrPort, value);
    }

    unsafeHtml(this: TCard, port: TExoChildrenPort, markup: unknown): void {
        this.attr(port as unknown as TExoAttrPort, markup);
    }

    on(this: TCard, port: TExoEventPort, handler: TExoEventHandler, subject?: unknown): void {
        this.listeners.push([port.index, handler, subject]);
    }
}

/** An instance of a backend that keeps no lifecycle — the shape `@exodra/string` has. */
const bareNode = (backend: ExoCardBackend, context: TExoContextFrame | null = null): TCard =>
    ({
        __proto__: backend,
        context: context,
        disposers: null,
        state: EXO_NO_STATE,
        managedState: EXO_NO_STATE,
        effectStops: null,
        transitionOverrides: null,
        serviceState: undefined,
    } as unknown as TCard);

/** The same instance with the slot a lifecycle-keeping backend seats in its own literal. */
const liveNode = (backend: ExoCardBackend): TCard =>
    ({
        __proto__: backend,
        context: null,
        disposers: null,
        state: EXO_NO_STATE,
        managedState: EXO_NO_STATE,
        effectStops: null,
        transitionOverrides: null,
        serviceState: undefined,
        live: null,
    } as unknown as TCard);

/** What a browser does on the line after its `appendChild`: read the slot and call through it. */
const goLive = (enode: TCard, on = true): void => {
    const held = enode.live;
    if (held !== null && held !== undefined) held.setMounted?.(held, on);
};

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

const STORE = exoContextToken<{ readonly tag: string }>('store');

const machine = (schema: TExoCursorDeclaration<unknown>) =>
    withExoComputedMachine(createExoMachineBuilder<TCard>(schema));

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

/** The pending word of a decorated instance, read where the program says it lives. */
const pending = (program: { readonly pendingRow: number }, enode: TCard): number =>
    enode.managedState[program.pendingRow] as number;

// ═══════════════════════════════════════════════════════════════════════════════════════════
// ONE NUMBERING, AND ROWS RATHER THAN FIELDS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('what the decoration assigns', () => {
    it('continues the schema`s port numbering into the state fields', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        expect(schema.portList).toHaveLength(3);

        const name = m.field('');
        const open = m.field(false);
        const width = m.field(48);

        expect([name.address, open.address, width.address]).toEqual([3, 4, 5]);
        expect([name.bit, open.bit, width.bit]).toEqual([1, 2, 4]);
    });

    it('takes TWO rows for itself and one per field, and adds NO field to the exonode', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('Alderaan');
        const width = m.field(48);
        m.derive(schema.ports.label, [name], (value) => value);
        m.derive(schema.ports.size, [width], (value) => `${value}`);
        const CARD = m.done();

        expect(CARD.program.pendingRow).toBe(0);
        expect(CARD.program.wakesRow).toBe(1);
        expect([name.row, width.row]).toEqual([2, 3]);

        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(enode.managedState).toHaveLength(4);
        expect(enode.managedState).not.toBe(EXO_NO_STATE);
        expect(Object.keys(enode)).toEqual([
            'context',
            'disposers',
            'state',
            'managedState',
            'effectStops',
            'transitionOverrides',
            'serviceState',
        ]);
    });

    it('keeps an author`s state in `state`, taking NO managed row for it', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const K = m.createInitialState(() => ({ ticks: 0 }));
        const name = m.field('Alderaan');
        m.derive(schema.ports.label, [name], (value) => value);
        const CARD = m.done();

        // TWO ROWS ARE THE DECORATION'S OWN and the third is the one field; the author's state is
        // NOT among them, which is what makes `state` and `managedState` two tables and not one.
        expect(name.row).toBe(2);

        const backend = new ExoCardBackend();
        const enode = bareNode(backend);
        armExoNode(enode, CARD);
        expect(enode.readState(K)).toEqual({ ticks: 0 });
        expect(enode.state).toEqual({ ticks: 0 });
        expect(enode.managedState).toHaveLength(3);
        expect(backend.fills).toEqual([[0, 'Alderaan']]);
        expect(backend.written).toEqual([0]);
    });

    it('hands the author`s initial state the index and the params the arm call carries', () => {
        const m = machine(createExoSchema(buildCard));
        m.createInitialState((_enode, index, params) => ({ index, params }));
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, m.done(), 4, { id: 'a' });
        expect(enode.state).toEqual({ index: 4, params: { id: 'a' } });
    });

    it('counts the fields, so the count and the declarations cannot disagree', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        const open = m.field(false);
        m.derive(schema.ports.label, [name, open], (name, open) =>
            open ? name : name.slice(0, 3)
        );
        const CARD = m.done();
        expect([...CARD.program.fieldMarks]).toEqual([0b1, 0b1]);
        expect(CARD.program.portIndexes[0]).toBe(0);
        expect(CARD.declaration).toBe(schema);
    });

    it('names each slot by the address it writes, which is what a refusal has to say', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        const trimmed = m.field('');
        m.derive(trimmed, [name], (name) => name.trim());
        m.derive(schema.ports.label, [trimmed], (trimmed) => trimmed);
        const CARD = m.done();
        expect([...CARD.program.labels]).toEqual(['field 4', 'port data-label']);
    });

    it('names a fill and an effectOn apart, so a census says which declaration was written', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        m.derive(schema.ports.label, [name], (value) => value);
        m.fill([name], () => undefined);
        m.effectOn([name], () => null);
        const CARD = m.done();
        expect([...CARD.program.labels]).toEqual(['port data-label', 'fill 0', 'effect 1']);
    });

    it('is a MERGE over the same builder: what it does not name it leaves alone', () => {
        const base = createExoMachineBuilder<TCard>(createExoSchema(buildCard));
        const wire = base.createInitialState;
        const on = base.on;
        const effect = base.effect;
        const transition = base.transition;
        const decorated = withExoComputedMachine(base);
        expect(decorated).toBe(base);
        // UNTOUCHED, because the pack names neither: an author's handler reaches the engine's own
        // body, and so does a bare effect.
        expect(decorated.on).toBe(on);
        expect(decorated.effect).toBe(effect);
        // WRAPPED, and each for its own reason: the seed has to seat the managed row before an
        // author's unmanaged value lands beside it, and a transition has to commit afterwards.
        expect(decorated.createInitialState).not.toBe(wire);
        expect(decorated.transition).not.toBe(transition);
        expect(decorated.field).toBeTypeOf('function');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// A WIRED INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════════════════

function makeCard(): {
    readonly setName: (enode: TCard, value: string) => void;
    readonly toggle: (enode: TCard) => void;
    readonly wire: (enode: TCard, name: string) => TCard;
    readonly wireThroughHandler: (enode: TCard) => TCard;
} {
    const schema = createExoSchema(buildCard);
    const P = schema.ports;
    const m = machine(schema);
    const name = m.field('');
    const open = m.field(false);
    const tag = m.field((c) => c.inject(STORE)?.tag ?? 'none');
    m.derive(P.label, [name, open], (name, open) => (open ? name : name.slice(0, 3)));
    m.derive(P.size, [tag], (tag) => tag);
    const seen: (TCard | null)[] = [null];
    m.on(P.click, (instance) => {
        seen[0] = instance;
    });
    const CARD = m.done();
    const setName = exoTransition<TCard, string>(CARD, (s, value) => name.set(s, value));
    return {
        setName,
        toggle: exoTransition<TCard>(CARD, (s) => open.set(s, !open.get(s))),
        wire: (enode, value): TCard => {
            armExoNode(enode, CARD);
            setName(enode, value);
            return enode;
        },
        wireThroughHandler: (enode): TCard => {
            armExoNode(enode, CARD);
            click(enode);
            return took(seen);
        },
    };
}

describe('an instance the decoration wired', () => {
    it('seeds every field from a constant, from the context, and from the creator`s seed', () => {
        const card = makeCard();
        const backend = new ExoCardBackend();
        const context = exoContextFrame(null, STORE, { tag: 'gold' });
        card.wire(bareNode(backend, context), 'Alderaan');
        // THE MOUNT RUNS AT THE DECLARED VALUE and the transition moves it off that — there is no
        // seed, so `label` is filled twice: once empty at arming, once by `setName`.
        expect(backend.written).toEqual([0, 1, 0]);
        expect(backend.fills).toEqual([
            [0, ''],
            [1, 'gold'],
            [0, 'Ald'],
        ]);
    });

    it('starts at the DECLARED value when the creator hands no seed', () => {
        const card = makeCard();
        const backend = new ExoCardBackend();
        card.wireThroughHandler(bareNode(backend));
        expect(backend.fills).toEqual([
            [0, ''],
            [1, 'none'],
        ]);
    });

    it('stores and marks in ONE call, so a commit follows a handle`s set', () => {
        const card = makeCard();
        const backend = new ExoCardBackend();
        const enode = card.wire(bareNode(backend), 'Alderaan');
        backend.fills.length = 0;
        card.setName(enode, 'Bespin');
        expect(backend.fills).toEqual([[0, 'Bes']]);
    });

    it('reads through the same handle it writes through', () => {
        const card = makeCard();
        const backend = new ExoCardBackend();
        const enode = card.wire(bareNode(backend), 'Alderaan');
        backend.fills.length = 0;
        card.toggle(enode);
        expect(backend.fills).toEqual([[0, 'Alderaan']]);
    });

    it('names ONE instance among many, so two cards are moved apart', () => {
        const card = makeCard();
        const backend = new ExoCardBackend();
        const first = card.wire(bareNode(backend), 'Alderaan');
        const second = card.wire(bareNode(backend), 'Bespin');
        expect(first.managedState).not.toBe(second.managedState);
        backend.fills.length = 0;
        card.setName(second, 'Coruscant');
        expect(backend.fills).toEqual([[0, 'Cor']]);
    });
});

describe('where a decorated instance starts', () => {
    it('mounts at the DECLARED value, then a transition drives it and re-derives', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        const ran: string[] = [];
        m.derive(schema.ports.label, [name], (value) => {
            ran.push(`derive ${value}`);
            return value;
        });
        const setName = m.transition<string>((enode: TCard, value) => name.set(enode, value));
        const CARD = m.done();
        const backend = new ExoCardBackend();
        const enode = bareNode(backend);

        armExoNode(enode, CARD);
        expect(ran).toEqual(['derive ']);

        setName(enode, 'Alderaan');
        expect(ran).toEqual(['derive ', 'derive Alderaan']);
        expect(backend.fills).toEqual([
            [0, ''],
            [0, 'Alderaan'],
        ]);
        expect(backend.written).toEqual([0, 0]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// FILLS
// ═══════════════════════════════════════════════════════════════════════════════════════════

type TFakeRegion = {
    readonly rows: string[];
    readonly size: number;
    insert(row: string): void;
    remove(i: number): void;
};

const fakeRegion = (): TFakeRegion => {
    const rows: string[] = [];
    return {
        rows,
        get size(): number {
            return rows.length;
        },
        insert: (row): void => {
            rows.push(row);
        },
        remove: (i): void => {
            rows.splice(i, 1);
        },
    };
};

describe('a fill', () => {
    it('is handed the EXONODE and reads its fields through their handles', () => {
        const m = machine(createExoSchema(buildCard));
        const region = fakeRegion();
        const rows = m.field(region);
        const count = m.field(0);
        const seen: unknown[][] = [];
        m.fill([rows, count], (c) => {
            const rowsIn = rows.get(c);
            const n = count.get(c);
            seen.push([rowsIn, n]);
            for (let k = rowsIn.size; k < n; k++) rowsIn.insert(`row ${k}`);
            for (let k = rowsIn.size - 1; k >= n; k--) rowsIn.remove(k);
        });
        const CARD = m.done();
        const setCount = exoTransition<TCard, number>(CARD, (s, v) => count.set(s, v));

        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(seen).toEqual([[region, 0]]);
        setCount(enode, 3);
        expect(region.rows).toEqual(['row 0', 'row 1', 'row 2']);
        setCount(enode, 1);
        expect(region.rows).toEqual(['row 0']);
        expect(seen).toHaveLength(3);
    });

    it('is woken by its own fields and by no others', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const count = m.field(0);
        const elsewhere = m.field('');
        let runs = 0;
        m.derive(schema.ports.label, [elsewhere], (value) => value);
        m.fill([count], () => {
            runs += 1;
        });
        const CARD = m.done();
        const setCount = exoTransition<TCard, number>(CARD, (s, v) => count.set(s, v));
        const setElse = exoTransition<TCard, string>(CARD, (s, v) => elsewhere.set(s, v));

        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(runs).toBe(1);
        setElse(enode, 'moved');
        expect(runs).toBe(1);
        setCount(enode, 2);
        expect(runs).toBe(2);
    });

    it('runs AFTER every derivation of the same commit, so the ports already agree', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        const order: string[] = [];
        m.derive(schema.ports.label, [name], (value) => {
            order.push(`derive ${value}`);
            return value;
        });
        m.fill([name], (c) => {
            order.push(`fill ${name.get(c)}`);
        });
        const CARD = m.done();
        const setName = exoTransition<TCard, string>(CARD, (s, v) => name.set(s, v));
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        order.length = 0;
        setName(enode, 'Bespin');
        expect(order).toEqual(['derive Bespin', 'fill Bespin']);
    });

    it('owns NO stop: what its body returns is discarded and never called back', () => {
        const m = machine(createExoSchema(buildCard));
        const tick = m.field(0);
        const log: string[] = [];
        m.fill([tick], () => {
            log.push('ran');
            return () => log.push('called back');
        });
        const CARD = m.done();
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        unmount(enode);
        expect(log).toEqual(['ran']);
    });

    it('accepts an EMPTY dependency list — run once at the wire and never woken again', () => {
        const m = machine(createExoSchema(buildCard));
        const tick = m.field(0);
        let runs = 0;
        m.fill([], () => {
            runs += 1;
        });
        m.fill([tick], () => undefined);
        const CARD = m.done();
        const bump = exoTransition<TCard>(CARD, (s) => tick.set(s, tick.get(s) + 1));
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(runs).toBe(1);
        bump(enode);
        bump(enode);
        expect(runs).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// effectOn — the engine's effect plus a wake set
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('an effectOn', () => {
    it('is established at the wire and RE-established when a declared field moves', () => {
        const m = machine(createExoSchema(buildCard));
        const key = m.field(1);
        const log: string[] = [];
        m.effectOn([key], (c) => {
            const at = key.get(c);
            log.push(`start ${at}`);
            return () => log.push(`stop ${at}`);
        });
        const CARD = m.done();
        const setKey = exoTransition<TCard, number>(CARD, (s, v) => key.set(s, v));
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(log).toEqual(['start 1']);
        setKey(enode, 2);
        expect(log).toEqual(['start 1', 'stop 1', 'start 2']);
        unmount(enode);
        expect(log).toEqual(['start 1', 'stop 1', 'start 2', 'stop 2']);
    });

    it('does not re-establish when a field it did not declare changes', () => {
        const m = machine(createExoSchema(buildCard));
        const key = m.field(1);
        const other = m.field(0);
        let starts = 0;
        m.effectOn([key], () => {
            starts += 1;
            return null;
        });
        m.fill([other], () => undefined);
        const CARD = m.done();
        const setOther = exoTransition<TCard, number>(CARD, (s, v) => other.set(s, v));
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        setOther(enode, 9);
        expect(starts).toBe(1);
    });

    it('runs after every derivation of the same commit, not interleaved with them', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        const order: string[] = [];
        m.derive(schema.ports.label, [name], (value) => {
            order.push('derive');
            return value;
        });
        m.effectOn([name], () => {
            order.push('effect');
            return null;
        });
        const CARD = m.done();
        const setName = exoTransition<TCard, string>(CARD, (s, v) => name.set(s, v));
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        order.length = 0;
        setName(enode, 'Bespin');
        expect(order).toEqual(['derive', 'effect']);
    });

    it('accepts an EMPTY dependency list — established once and unwakeable afterwards', () => {
        const m = machine(createExoSchema(buildCard));
        const tick = m.field(0);
        let starts = 0;
        m.effectOn([], () => {
            starts += 1;
            return null;
        });
        m.fill([tick], () => undefined);
        const CARD = m.done();
        const bump = exoTransition<TCard>(CARD, (s) => tick.set(s, tick.get(s) + 1));
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        bump(enode);
        expect(starts).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE TWO DEBITS — what decorating costs an instance, said out loud
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('what decorating costs an instance', () => {
    it('allocates a stop array even where the author declared no effect at all', () => {
        const schema = createExoSchema(buildCard);
        const plain = createExoMachineBuilder<TCard>(schema);
        plain.createInitialState(() => 0);
        const PLAIN = plain.done();
        const bare = bareNode(new ExoCardBackend());
        armExoNode(bare, PLAIN);
        expect(bare.effectStops).toBeNull();
        expect(bare.disposers).toBeNull();

        const m = machine(schema);
        const name = m.field('Alderaan');
        m.derive(schema.ports.label, [name], (value) => value);
        const CARD = m.done();
        const decorated = bareNode(new ExoCardBackend());
        armExoNode(decorated, CARD);
        // TWO SLOTS AND NO AUTHOR EFFECT: the initial fill, and the chain install.
        expect(decorated.effectStops).toHaveLength(2);
        // NO DISPOSER: the dispose walk stops effects off `effectStops`, so arming registers none.
        expect(decorated.disposers).toBeNull();
    });

    it('puts `mounted → false` AFTER every effect the author declared, at the teardown', () => {
        const m = machine(createExoSchema(buildCard));
        const live = m.mounted();
        const log: string[] = [];
        m.effectOn([live], (c) => {
            const on = live.get(c);
            return () => log.push(`author off ${on}`);
        });
        m.fill([live], (c) => {
            log.push(`fill ${live.get(c)}`);
        });
        const CARD = m.done();
        const enode = liveNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        goLive(enode);
        log.length = 0;
        unmount(enode);
        expect(log).toEqual(['author off true', 'fill false']);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// mounted
// ═══════════════════════════════════════════════════════════════════════════════════════════

function makeMeasured(): {
    readonly mounted: TExoMachineFieldHandle<TCard, boolean>;
    readonly log: string[];
    readonly wire: (enode: TCard) => TCard;
} {
    const schema = createExoSchema(buildCard);
    const m = machine(schema);
    const name = m.field('Alderaan');
    const live = m.mounted();
    const log: string[] = [];
    m.derive(schema.ports.label, [name], (value) => value);
    m.effectOn([live], (c) => {
        const on = live.get(c);
        log.push(`start ${on}`);
        return () => log.push(`stop ${on}`);
    });
    const CARD = m.done();
    return {
        mounted: live,
        log,
        wire: (enode): TCard => {
            armExoNode(enode, CARD);
            return enode;
        },
    };
}

describe('mounted', () => {
    it('is FALSE while the wire runs and TRUE once the instance goes live', () => {
        const measured = makeMeasured();
        const enode = measured.wire(liveNode(new ExoCardBackend()));
        expect(measured.mounted.get(enode)).toBe(false);
        expect(measured.log).toEqual(['start false']);
        goLive(enode);
        expect(measured.mounted.get(enode)).toBe(true);
        expect(measured.log).toEqual(['start false', 'stop false', 'start true']);
    });

    it('goes false again at the unmount, with the author`s effect already torn down', () => {
        const measured = makeMeasured();
        const enode = measured.wire(liveNode(new ExoCardBackend()));
        goLive(enode);
        measured.log.length = 0;
        unmount(enode);
        expect(measured.log).toEqual(['stop true']);
        expect(measured.mounted.get(enode)).toBe(false);
    });

    it('is SUBSCRIBED and FILLED before it is ever placed — created comes before placed', () => {
        const measured = makeMeasured();
        const backend = new ExoCardBackend();
        const enode = measured.wire(liveNode(backend));
        expect(backend.fills).toEqual([[0, 'Alderaan']]);
        expect(backend.written).toEqual([0]);
        expect(measured.log).toEqual(['start false']);
        goLive(enode);
        expect(backend.fills).toEqual([[0, 'Alderaan']]);
    });

    it('holds the instance through a live object of its own, not on the instance', () => {
        const measured = makeMeasured();
        const enode = measured.wire(liveNode(new ExoCardBackend()));
        const held = enode.live as TExoComputedLive<TCard> | null | undefined;
        if (held === null || held === undefined) {
            throw new Error('nothing was registered');
        }
        expect(held).not.toBe(enode);
        expect(held.instance).toBe(enode);
        expect(held.setMounted).toBeTypeOf('function');
        expect('setMounted' in enode).toBe(false);
    });

    it('costs a component that never declares it NOTHING — no field, no row, no registration', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('Alderaan');
        m.derive(schema.ports.label, [name], (value) => value);
        const CARD = m.done();
        const enode = liveNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        expect(enode.managedState).toHaveLength(3);
        expect(CARD.program.fieldMarks).toHaveLength(1);
        expect(enode.live).toBeNull();
    });

    it('does NOT refuse an exonode with no lifecycle slot — it stays false, which is true', () => {
        const measured = makeMeasured();
        const enode = measured.wire(bareNode(new ExoCardBackend()));
        expect(measured.mounted.get(enode)).toBe(false);
        expect(measured.log).toEqual(['start false']);
        expect('live' in enode).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('a derivation whose address is a state field', () => {
    it('wakes what reads that field, in the SAME commit, and needs no word of its own', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        const open = m.field(false);
        const visible = m.field('');
        m.derive(visible, [name, open], (name, open) => (open ? name : name.slice(0, 3)));
        m.derive(schema.ports.label, [visible], (visible) => visible);
        m.derive(schema.ports.size, [visible], (visible) => `${visible.length}`);
        const CARD = m.done();
        const setName = exoTransition<TCard, string>(CARD, (s, v) => name.set(s, v));

        const backend = new ExoCardBackend();
        const enode = bareNode(backend);
        armExoNode(enode, CARD);
        backend.fills.length = 0;
        setName(enode, 'Alderaan');
        expect(backend.fills).toEqual([
            [0, 'Ald'],
            [1, '3'],
        ]);
    });

    it('refuses an order in which the downstream one is declared first', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        const visible = m.field('');
        m.derive(schema.ports.label, [visible], (visible) => visible);
        m.derive(visible, [name], (name) => name);
        expect(() => m.done()).toThrow(/not topological/);
    });

    it('feeds a FILL declared BEFORE it, in the same commit, on the value it stored', () => {
        const m = machine(createExoSchema(buildCard));
        const name = m.field('');
        const visible = m.field('');
        const seen: string[] = [];
        m.fill([visible], (c) => seen.push(visible.get(c)));
        m.derive(visible, [name], (name) => name.toUpperCase());
        const CARD = m.done();
        const setName = exoTransition<TCard, string>(CARD, (s, v) => name.set(s, v));

        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        seen.length = 0;
        setName(enode, 'Bespin');
        expect(seen).toEqual(['BESPIN']);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REFUSALS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('the decoration`s refusals', () => {
    it('refuses a declaration made after done()', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        m.derive(schema.ports.label, [name], (value) => value);
        m.done();
        expect(() => m.field(0)).toThrow(/after done\(\)/);
        expect(() => m.createInitialState(() => 0)).toThrow(/after done\(\)/);
        expect(() => m.effectOn([name], () => null)).toThrow(/after done\(\)/);
    });

    it('refuses a second mounted(), and a second done()', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        const live = m.mounted();
        m.derive(schema.ports.label, [name], (value) => value);
        m.derive(schema.ports.size, [live], (on) => (on ? 'yes' : 'no'));
        expect(() => m.mounted()).toThrow(/declared twice/);
        m.done();
        expect(() => m.done()).toThrow(/compiles once/);
    });

    it('refuses a derivation that reads nothing, because nothing could ever wake it', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        m.field('x');
        m.derive(schema.ports.label, [], () => 'constant');
        expect(() => m.done()).toThrow(/reads no field/);
    });
});

describe('a field nothing derives from', () => {
    it('is refused at done(), by its ADDRESS, and told to be a slot instead', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        m.field(0);
        m.derive(schema.ports.label, [name], (value) => value);
        expect(() => m.done()).toThrow(/field 4 is read by none/);
    });

    it('is refused by its own NAME when it is mounted()', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        m.mounted();
        m.derive(schema.ports.label, [name], (value) => value);
        expect(() => m.done()).toThrow(/mounted\(\) is read by none/);
    });

    it('is NOT refused when a fill or an effectOn is the only reader', () => {
        const m = machine(createExoSchema(buildCard));
        const filled = m.field(0);
        const watched = m.field(0);
        m.fill([filled], () => undefined);
        m.effectOn([watched], () => null);
        expect(() => m.done()).not.toThrow();
    });

    it('is NOT refused in a decorated machine that declares no work at all', () => {
        const m = machine(createExoSchema(buildCard));
        m.field('kept');
        m.field(0);
        expect(() => m.done()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TRANSITIONS AND HOLDS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('a transition', () => {
    it('IS the body on a machine that declares no slot — no wrapper, no settler', () => {
        const m = machine(createExoSchema(buildCard));
        const name = m.field('');
        const CARD = m.done();
        const apply = (s: TCard, v: string): void => name.set(s, v);
        expect(exoTransition<TCard, string>(CARD, apply)).toBe(apply);
    });

    it('is a WRAPPER the moment a derivation exists', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        m.derive(schema.ports.label, [name], (value) => value);
        const CARD = m.done();
        const apply = (s: TCard, v: string): void => name.set(s, v);
        expect(exoTransition<TCard, string>(CARD, apply)).not.toBe(apply);
    });

    it('is a WRAPPER for a FILL with no derivation, whose settler is what runs the fill', () => {
        const m = machine(createExoSchema(buildCard));
        const tick = m.field(0);
        let runs = 0;
        m.fill([tick], () => {
            runs += 1;
        });
        const CARD = m.done();
        const apply = (s: TCard): void => tick.set(s, tick.get(s) + 1);
        const bump = exoTransition<TCard>(CARD, apply);
        expect(bump).not.toBe(apply);
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);
        bump(enode);
        expect(runs).toBe(2);
    });
});

describe('a hold', () => {
    it('runs a shared derivation ONCE for several writes, and settles at its own end', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        const open = m.field(false);
        let runs = 0;
        m.derive(schema.ports.label, [name, open], (name, open) => {
            runs += 1;
            return open ? name : name.slice(0, 3);
        });
        const CARD = m.done();
        const applyName = (s: TCard, v: string): void => name.set(s, v);
        const applyOpen = (s: TCard, v: boolean): void => open.set(s, v);

        const backend = new ExoCardBackend();
        const enode = bareNode(backend);
        armExoNode(enode, CARD);
        runs = 0;
        backend.fills.length = 0;
        enode.hold(CARD, (s) => {
            applyName(s, 'Alderaan');
            applyOpen(s, true);
            expect(backend.fills).toEqual([]);
        });
        expect(runs).toBe(1);
        expect(backend.fills).toEqual([[0, 'Alderaan']]);
        expect(pending(CARD.program, enode)).toBe(0);
    });

    it('parks the chain table and restores it, even when the body throws', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('');
        m.derive(schema.ports.label, [name], (value) => value);
        const CARD = m.done();
        const backend = new ExoCardBackend();
        const enode = bareNode(backend);
        armExoNode(enode, CARD);
        const chains = enode.managedState[CARD.program.wakesRow];
        expect(chains).not.toBeNull();

        backend.fills.length = 0;
        expect(() =>
            enode.hold(CARD, (s) => {
                name.set(s, 'Bespin');
                throw new Error('body failed');
            })
        ).toThrow(/body failed/);
        expect(enode.managedState[CARD.program.wakesRow]).toBe(chains);
        expect(backend.fills).toEqual([[0, 'Bespin']]);
    });
});

describe('a slot the author keeps', () => {
    it('leaves the pending word at zero, written inside a hold and outside one', () => {
        const schema = createExoSchema(buildCard);
        const m = machine(schema);
        const name = m.field('Alderaan');
        const K = m.createInitialState(() => ({ ticks: 0 }));
        m.derive(schema.ports.label, [name], (value) => value);
        const CARD = m.done();
        const enode = bareNode(new ExoCardBackend());
        armExoNode(enode, CARD);

        enode.readState(K).ticks += 1;
        expect(pending(CARD.program, enode)).toBe(0);
        enode.hold(CARD, (s) => {
            s.readState(K).ticks += 1;
        });
        expect(enode.readState(K).ticks).toBe(2);
        expect(pending(CARD.program, enode)).toBe(0);
    });
});
