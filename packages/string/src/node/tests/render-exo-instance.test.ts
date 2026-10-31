import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoFillDoors,
    TExoTextPort,
    TExoAttrPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { exoContextToken } from '@exodra/context';
import { createExoTestMachine } from '@exodra/test-utils';
// IMPORTED THROUGH THE BARREL ON PURPOSE — the last describe in this file is about what
// `@exodra/string` actually exports, so reaching past `./index` would test nothing.
import * as barrel from '../../index';
import type { TExoStrNode } from '../EXO_STR_NODE_VOCABULARY';

import type { TExoStrMachine } from '../types/TExoStrMachine';
import { ExoStrBackend } from '@exodra/string';

const EXO_STR = new ExoStrBackend();

function buildBox(b: TExoSchemaCursor) {
    let label!: TExoTextPort;
    b.el('div', { class: 'box' }, (d) => {
        label = d.textPort();
    });
    return { label };
}

function buildShell(b: TExoSchemaCursor) {
    let slot!: TExoChildrenPort;
    b.el('section', { class: 'shell' }, (s) => {
        slot = s.childrenPort();
    });
    return { slot };
}

type TBoxPorts = ReturnType<typeof buildBox>;

const boxWith = (
    make: (ports: TBoxPorts) => TExoMachineInitialState<TExoStrNode>
): TExoStrMachine => createExoTestMachine(buildBox, make);

describe('renderExoStrInstance after a wire throws', () => {
    it('runs the teardowns the wire registered before it threw', () => {
        const ran: string[] = [];
        const BOOM = boxWith(() => (c) => {
            c.onTeardown(() => ran.push('first'));
            c.onTeardown(() => ran.push('second'));
            throw new Error('wire exploded');
        });

        expect(() => EXO_STR.render(BOOM)).toThrow('wire exploded');
        expect(ran).toEqual(['first', 'second']);
    });

    // There is no pool and no depth counter to leak — an instance is one exonode the render drops —
    // so the guarantee is unspellable rather than guarded, and what is left to check is that a
    // render after a failed one is unaffected by it.
    it('renders correctly after five failed renders', () => {
        const BOOM = boxWith((P) => (c) => {
            c.text(P.label, 'never seen');
            throw new Error('wire exploded');
        });
        const OK = boxWith((P) => (c, i) => {
            c.text(P.label, 'row ' + i);
        });
        const THREE: TExoStrMachine = createExoTestMachine(buildShell, (P) => (c: TExoStrNode) => {
            c.list(P.slot, OK, 3);
        });

        for (let attempt = 0; attempt < 5; attempt++) {
            expect(() => EXO_STR.render(BOOM)).toThrow('wire exploded');
        }

        expect(EXO_STR.render(THREE)).toBe(
            '<section class="shell">' +
                '<div class="box">row 0</div>' +
                '<div class="box">row 1</div>' +
                '<div class="box">row 2</div>' +
                '</section>'
        );
    });

    it('carries no frame of its own into the next render, even when the wire throws', () => {
        // The chain lives on the INSTANCE and the outer frame is a PARAMETER, so a frame left
        // standing is unspellable rather than guarded — there is nowhere for one to stand. The
        // render after a throwing one is the proof: it injects nothing because it was given nothing.
        const BOOM = boxWith((P) => (c) => {
            c.text(P.label, 'x');
            throw new Error('wire exploded');
        });
        const SEEN = exoContextToken<string>('seen');
        const seen: (string | undefined)[] = [];
        const AFTER = boxWith((P) => (c) => {
            seen.push(c.inject(SEEN));
            c.text(P.label, 'after');
        });

        expect(() => EXO_STR.render(BOOM)).toThrow('wire exploded');
        EXO_STR.render(AFTER);
        expect(seen).toEqual([undefined]);
    });
});

describe('the teardown a wire owns during a server render', () => {
    // `onTeardown` is the one door a wire has for registering a teardown, and the wire is SHARED with the
    // browser backend — core's machine wire calls it for any component declaring an effect. An
    // instance ends when its markup is taken, so a disposer collected and never run is a
    // subscription leaked per request in a process that stays up.
    it('runs what the root wire owned, in registration order, and empties the slot', () => {
        const ran: string[] = [];
        let seen!: TExoStrNode;
        const CARD = boxWith((P) => (c) => {
            seen = c;
            c.text(P.label, 'mounted');
            c.onTeardown(() => {
                ran.push('first');
                c.text(P.label, 'torn down');
            });
            c.onTeardown(() => ran.push('second'));
        });

        const html = EXO_STR.render(CARD);

        expect(ran).toEqual(['first', 'second']);
        expect(seen.disposers).toBe(null);
        // The markup was taken BEFORE the teardown ran: a port a disposer wrote cannot reach it.
        expect(html).toBe('<div class="box">mounted</div>');
    });

    it('runs them for every child instance, each one only its own', () => {
        const ran: number[] = [];
        const ROW = boxWith((P) => (c, i) => {
            c.text(P.label, 'row ' + i);
            c.onTeardown(() => ran.push(i));
        });
        const THREE: TExoStrMachine = createExoTestMachine(buildShell, (P) => (c: TExoStrNode) => {
            c.list(P.slot, ROW, 3);
        });

        const html = EXO_STR.render(THREE);

        // One instance, one drain: three rows own one disposer each and all three run.
        expect(ran).toEqual([0, 1, 2]);
        expect(html).toBe(
            '<section class="shell">' +
                '<div class="box">row 0</div>' +
                '<div class="box">row 1</div>' +
                '<div class="box">row 2</div>' +
                '</section>'
        );
    });
});

describe('the schema and its pieces, through the package barrel', () => {
    // A caller rendering instances itself must get THE SCHEMA THE ENTRY POINT WOULD HAVE BUILT,
    // rather than needing a second compiler that can disagree about port numbering. Every import is
    // from `./index`, so a dropped export stops the file compiling.
    it('renders byte-identically to the entry point', () => {
        const ROW = boxWith((P) => (c, i) => {
            c.text(P.label, 'row ' + i);
        });

        // The cached schema the entry point uses, and a fresh compile of the same declaration.
        const cached = barrel.exoStrSchemaOf(ROW, EXO_STR);
        const fresh = barrel.compileExoStrSchema(ROW.declaration, EXO_STR);

        // The entry point renders ONE instance and hands it index `0`.
        expect(barrel.renderExoStrInstance(cached, ROW, 0)).toBe(EXO_STR.render(ROW));
        // …and for a row the entry point never renders, where a second compiler's numbering parts.
        expect(barrel.renderExoStrInstance(fresh, ROW, 1)).toBe(
            barrel.renderExoStrInstance(cached, ROW, 1)
        );
        expect(cached.portCount).toBe(fresh.portCount);
    });

    it('exposes the writer that decides an attribute is ABSENT', () => {
        // The rule a caller building writers by hand gets wrong: `false` is NO attribute, not
        // `disabled=""` — which the DOM backend removes and hydration compares byte for byte.
        const write = barrel.EXO_STR_WRITERS.attribute('disabled', null);
        expect(write(false)).toBe('');
        expect(write(null)).toBe('');
        expect(write(true)).toBe(' disabled=""');
    });
});

// What the wires below assume about the exonode they are handed, and nothing more.
type TDriving = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    fillDoors(): TExoFillDoors;
};

// An attribute port AND a text port, so a test can fill one and skip the other.
function buildCard(b: TExoSchemaCursor) {
    let cls!: TExoAttrPort;
    let label!: TExoTextPort;
    b.el('div', null, (d) => {
        cls = d.port('class');
        label = d.textPort();
    });
    return { cls, label };
}

// Driving a port by hand: a fill is `values[index] = write(value)`, so `set` on a ports value is
// exactly `TExoStrNode.set`. There is no FILL RECORD to test — the DOM backends stamp one so the
// sweep restoring skipped ports leaves a hand-written one alone, where here a slot is born `''` and
// nothing sweeps, so nothing can undo a fill.
describe('driving a port by hand', () => {
    it('escapes the written value exactly as `set` does', () => {
        const RAW = '<b>hi</b> & so on';
        const VIA_SET = createExoTestMachine(
            buildBox,
            (P): TExoMachineInitialState<TDriving> =>
                (c) => {
                    c.text(P.label, RAW);
                }
        );
        const VIA_PORTS = createExoTestMachine(
            buildBox,
            (P): TExoMachineInitialState<TDriving> =>
                (c) => {
                    c.fillDoors().text(P.label, RAW);
                }
        );

        // Byte for byte, the only comparison worth making on this backend.
        expect(EXO_STR.render(VIA_PORTS)).toBe(EXO_STR.render(VIA_SET));
        // …and the port's own escaping really ran: the value reaches the page as TEXT.
        expect(EXO_STR.render(VIA_PORTS)).toBe(
            '<div class="box">&lt;b&gt;hi&lt;/b&gt; &amp; so on</div>'
        );
    });

    it('hands every instance its OWN ports value, because every instance is its own object', () => {
        const seen: TExoFillDoors[] = [];
        const ROW = createExoTestMachine(
            buildBox,
            (P): TExoMachineInitialState<TDriving> =>
                (c, i) => {
                    const p = c.fillDoors();
                    p.text(P.label, 'row ' + i);
                    seen.push(p);
                }
        );
        const THREE: TExoStrMachine = createExoTestMachine(buildShell, (P) => (c: TExoStrNode) => {
            c.list(P.slot, ROW, 3);
        });

        const html = EXO_STR.render(THREE);

        // Every row's value landed in its own render.
        expect(html).toContain('row 0');
        expect(html).toContain('row 1');
        expect(html).toContain('row 2');
        // `c.fillDoors()` returns the INSTANCE, so a wire that stashes it and writes later writes into
        // the row it belongs to.
        expect(seen[0]).not.toBe(seen[1]);
        expect(seen[1]).not.toBe(seen[2]);
    });

    it('prints the written port and nothing at all for the port the wire skipped', () => {
        const CARD = createExoTestMachine(
            buildCard,
            (P): TExoMachineInitialState<TDriving> =>
                (c) => {
                    c.fillDoors().attr(P.cls, 'written');
                }
        );

        // The attribute is the writer's whole output — head, value and quote — and the skipped text
        // port prints the empty string its slot was born holding.
        expect(EXO_STR.render(CARD)).toBe('<div class="written"></div>');
    });
});
