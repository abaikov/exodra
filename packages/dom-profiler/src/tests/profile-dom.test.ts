// @vitest-environment jsdom
//
// The schema core's two instruments, against a REAL render: `profileDom` patches the class a
// wiring function talks to, `profilePorts` wraps one schema's compiled setter table.

import { describe, expect, it } from 'vitest';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoTextPort,
    TExoMachineInitialState,
    TExoMachineNode,
} from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { profileDom } from '../profileDom';
import { profilePorts } from '../profilePorts';
import { host, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';

// ONE BACKEND FOR THE WHOLE FILE — it is the schema cache key and it is compared by POINTER, so a
// second one built per case would be a second key, a second compiled schema, and
// (for `profilePorts`) a wrapped setter table nothing calls. Two cases below build a SECOND backend
// on purpose; that is what they are about.
const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

type TWiring = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    onTeardown(off: () => void): void;
};

/** One row: an attribute filled once, an attribute a source may drive, a text position. */
function buildRow(b: TExoSchemaCursor) {
    let id!: TExoAttrPort;
    let cls!: TExoAttrPort;
    let label!: TExoTextPort;
    b.el('li', null, (li) => {
        id = li.port('data-id');
        cls = li.port('class');
        li.el('span', null, (span) => {
            label = span.textPort();
        });
    });
    return { id, cls, label };
}

const rowWith = (make: (ports: ReturnType<typeof buildRow>) => TExoMachineInitialState<TWiring>) =>
    createExoTestMachine(buildRow, make);

/**
 * A row whose `wire` fills ports once and whose effect follows `data` through `show` — drawn when the
 * effect starts, again on every change.
 */
const followingRow = <TValue>(
    data: TExoTestSource<TValue>,
    fill: (c: TExoMachineNode, ports: ReturnType<typeof buildRow>) => void,
    show: (c: TExoMachineNode, ports: ReturnType<typeof buildRow>, value: TValue) => void
) => {
    const schema = createExoSchema(buildRow);
    const m = createExoMachine<TExoMachineNode>(schema);
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                draw: (c) => show(c, schema.ports, data.getValue()),
            }),
        (m) => withExoWire(m, (c) => fill(c, schema.ports)),
        (m) => {
            const { draw } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    draw(c);
                    return data.onChange(() => draw(c));
                });
            });
        }
    );
    return machine;
};

describe('profileDom', () => {
    it('records TExoDomNode method timings while rendering', () => {
        const ROW = rowWith((P) => (c, i) => {
            c.attr(P.id, i);
            c.attr(P.cls, 'row');
            c.text(P.label, 'row ' + i);
        });

        const parent = host();
        const profiler = profileDom(EXO_BACKEND);
        // THREE INSTANCES, THREE CALLS. `render` mounts one and appends it, so three siblings are
        // three renders into one parent — and each of them runs the same wire.
        const disposers = [
            EXO_BACKEND.render(ROW, parent),
            EXO_BACKEND.render(ROW, parent),
            EXO_BACKEND.render(ROW, parent),
        ];
        const report = profiler.stop();
        for (const dispose of disposers) dispose();

        // THREE FILLS PER ROW: two `attr` and one `text`, and `text` has its OWN line rather than
        // hopping through `attr` — two doors sharing one call site would make that site see every
        // attribute body and every text body at once. So `attr` is six and `text` three.
        const attr = report.find((e) => e.method === 'attr');
        expect(attr).toBeDefined();
        expect(attr!.count).toBe(6);
        expect(attr!.avgMs).toBeGreaterThanOrEqual(0);
        expect(report.find((e) => e.method === 'text')!.count).toBe(3);
    });

    it("stop() restores the backend's own methods (reversible, no leftover patching)", () => {
        // THE TARGET IS THE BACKEND, which is where an exonode's methods live: a node is
        // `Object.create(backend)`, so `attr` is an own property of the composed object and there
        // is no class prototype to read. This also says which composition was profiled — the class
        // prototype could not, and that was the defect `profilePorts` had already fixed on its side.
        const holder = EXO_BACKEND as unknown as Record<string, unknown>;
        const original = holder.attr;

        const profiler = profileDom(EXO_BACKEND, { methods: ['attr'] });
        expect(holder.attr).not.toBe(original); // patched

        profiler.stop();
        expect(holder.attr).toBe(original); // restored
    });
});

describe('profilePorts', () => {
    const FOLLOWED_PORTS: readonly {
        what: string;
        initial: string;
        updates: readonly string[];
        fill: (c: TExoMachineNode, ports: ReturnType<typeof buildRow>) => void;
        show: (c: TExoMachineNode, ports: ReturnType<typeof buildRow>, value: string) => void;
        label: string;
        count: number;
    }[] = [
        {
            what: 'attribute',
            initial: 'light',
            updates: ['dark', 'light'],
            fill: (c, P) => {
                c.attr(P.id, 'a');
                c.text(P.label, 'l');
            },
            show: (c, P, value) => c.attr(P.cls, value),
            label: 'attr:class',
            count: 3,
        },
        {
            what: 'text',
            initial: 'a',
            updates: ['b'],
            fill: (c, P) => {
                c.attr(P.id, 'a');
                c.attr(P.cls, 'row');
            },
            show: (c, P, value) => c.text(P.label, value),
            label: 'text',
            count: 2,
        },
    ];

    // The subscriber an effect leaves behind calls the setter on every change, so every one of
    // those writes is timed here, after the render that armed it has returned.
    for (const c of FOLLOWED_PORTS) {
        it(`times the UPDATES of a followed ${c.what}, not just the first fill`, () => {
            const data = source(c.initial);
            const ROW = followingRow(data, c.fill, c.show);

            const profiler = profilePorts(ROW, EXO_BACKEND);
            const dispose = EXO_BACKEND.render(ROW, host());
            for (const value of c.updates) data.setValue(value);
            const report = profiler.stop();
            dispose();

            const entry = report.find((e) => e.label === c.label);
            expect(entry).toBeDefined();
            expect(entry!.count).toBe(c.count);
        });
    }

    // ═══ THE BACKEND IS THE SCHEMA'S CACHE KEY, AND EVERY TEST ABOVE RENDERS FROM THE FILE'S ONE
    // BACKEND ═══
    //
    // That is why the defect these two cases pin survived: a schema is cached per backend and the
    // key is compared by POINTER, while `profilePorts` used to be told only part of the key and
    // paired whatever it was told with the shipped composition. An application that composes its
    // own backend — which is the whole way a plugin is chosen — renders through a different key,
    // so the profiler wrapped a setter table nothing on the page called and every report came back
    // EMPTY, with nothing thrown and nothing to see.
    //
    // A SECOND BACKEND COMPOSED WITH NOTHING is the sharpest form of it: it replaces nothing at
    // all, so the rendered program is byte-for-byte the default one, and it STILL misses — because
    // `new` returns a fresh object and the key is a pointer, not a description.

    it('wraps the schema the page renders through when the app composed its own backend', () => {
        const ROW = rowWith((P) => (c, i) => {
            c.attr(P.id, i);
            c.attr(P.cls, 'row');
            c.text(P.label, 'row ' + i);
        });

        // ONE backend, named once and passed to both calls — which is exactly what the
        // documentation asks an application to do, and what the old signature could not express:
        // the profiler took only PART of the key and hard-coded the rest to the shipped one, so an
        // application that composed anything at all could not name what it rendered through.
        const backend = withExoCompiler(new ExoDomBackend());
        const parent = host();

        const profiler = profilePorts(ROW, backend);
        const first = backend.render(ROW, parent);
        const second = backend.render(ROW, parent);
        const report = profiler.stop();
        first();
        second();

        const labels = report.map((e) => e.label).sort();
        expect(labels).toEqual(['attr:class', 'attr:data-id', 'text']);
        for (const entry of report) expect(entry.count).toBe(2);
    });

    it('reports nothing when it is told a DIFFERENT backend from the one rendered', () => {
        // The failure the case above proves is gone, kept as the thing it actually is: a
        // mismatched backend is a profiler wrapping a table nobody calls. Asserted so that the
        // case above cannot pass by accident — if both backends landed on one schema, this report
        // would be full — and so that the empty report has a test naming why it is empty.
        const ROW = rowWith((P) => (c, i) => {
            c.attr(P.id, i);
            c.attr(P.cls, 'row');
            c.text(P.label, 'row ' + i);
        });

        const profiler = profilePorts(ROW, EXO_BACKEND); // the file's backend
        // another one, composed identically and NOT the same
        const rendered = withExoCompiler(new ExoDomBackend());
        const parent = host();
        const first = rendered.render(ROW, parent);
        const second = rendered.render(ROW, parent);
        const report = profiler.stop();
        first();
        second();

        expect(report).toEqual([]);
    });

    it("stop() puts the schema's own setters back", () => {
        const ROW = rowWith((P) => (c) => {
            c.attr(P.id, 'a');
            c.attr(P.cls, 'row');
            c.text(P.label, 'l');
        });

        const profiler = profilePorts(ROW, EXO_BACKEND);
        const first = EXO_BACKEND.render(ROW, host());
        first();
        const report = profiler.stop();
        expect(report).toHaveLength(3);

        // The schema is shared and cached on the machine forever, so a profiler that failed to
        // restore it would leave every later render in the process wrapped. After `stop()` the
        // ports still fill, and nothing new is recorded.
        const parent = host();
        const dispose = EXO_BACKEND.render(ROW, parent);
        expect(parent.querySelector('li')?.getAttribute('data-id')).toBe('a');
        expect(parent.querySelector('span')?.textContent).toBe('l');
        expect(profiler.getReport().every((e) => e.count === 1)).toBe(true);
        dispose();
    });
});
