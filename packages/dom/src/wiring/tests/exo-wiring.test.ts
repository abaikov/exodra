// @vitest-environment jsdom
//
// THE MACHINE'S DECLARATIONS, MADE ON A WIRE — and the assertion that the two forms are one engine.
//
// THE FAILURE THIS FILE EXISTS FOR. A second way to declare a component's update path is a second
// thing that can disagree with the first, and every way it could disagree is silent: a derivation
// that runs a different number of times, a fill woken by a field the other form does not wake, an
// effect re-established one commit late, a port written in a different order. None of those throws
// and none of them shows up in a snapshot of the finished markup — which is why the first test below
// compares the RUN LOG as well as the markup, after the same script of transitions, against a
// machine expressing the same component.
//
// WHAT THE TWO FORMS MAY LEGITIMATELY DIFFER IN is where the starting state comes from. A COMPONENT
// HAS NO PROPS AND NO SEED. Its field either DECLARES its starting value, or is written by an INIT
// TRANSITION fired at the exonode `c.one` hands back — and those two are not the same price. A
// declared value is part of the first fill; an init transition is a COMMIT OF ITS OWN, one whole
// extra pass of every derivation, because the instance is already armed and filled by the time a
// caller can reach it. Both halves below take their starting value as a parameter of the FACTORY
// that builds them, which is the declared form and costs the fill and nothing else.
//
// So the two cases below that compare the MOUNT give the machine a declared starting value, and the
// case that compares a LATER COMMIT fires the init transition — the spelling a machine needs when
// the value comes from outside. The server case has no choice at all: `@exodra/string`'s `one`
// hands back nothing, so there is no exonode there to fire anything at.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoEventPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { exoTransition, withExoComputedMachine } from '@exodra/computed';
import type { TExoComputedMachine, TExoComputedMachineNode } from '@exodra/computed';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
// `exoWiring` IS `@exodra/computed`'s — nothing in it is about the DOM, and standing in this
// package's barrel made it unreachable from a backend that may not depend on this package. This
// suite stays HERE because what it asserts is a CROSS-BACKEND parity: the same component wired two
// ways, rendered by `@exodra/dom` and by `@exodra/string`, and a suite in `@exodra/computed` could
// name neither of them.
import { exoWiring } from '@exodra/computed';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

// WHAT THE BACKEND ABOVE ACTUALLY HANDS A WIRE, and the reason everything below is annotated
// `TExoDomNode` flatly. `TExoDomNode` is the BARE exonode — the instance's fields and the shipped
// methods, and not one name a pack added — which is precisely what `withExoChildList(withExoCompiler(new ExoDomBackend()))` hands out.
// NOTHING HERE BINDS. A wiring block drives its ports from DERIVATIONS, which is the whole subject
// of this file, and not one wire in it names a source. If a wire here ever does name a source,
// `c.bind` stops resolving on this type, and the repair is to compose `withExoBinding` and widen
// the annotation to `TExoDomNode & TExoBindingApi` together — the refusal working, not a nuisance.

// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE COMPONENT UNDER TEST, EXPRESSED TWICE
// ─────────────────────────────────────────────────────────────────────────────────────────────

interface TCardPorts {
    label: TExoTextPort;
    len: TExoTextPort;
    click: TExoEventPort;
}

/**
 * A CHAIN, TWO PORTS AND AN EVENT — the smallest markup that exercises every part the two forms
 * share: a derivation into a FIELD (the upstream half of a chain), two derivations out of that field
 * into PORTS, and a handler.
 */
function buildCard(b: TExoSchemaCursor): TCardPorts {
    let label!: TExoTextPort;
    let len!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('div', { class: 'card' }, (div) => {
        click = div.eventPort('click');
        div.el('b', null, (bold) => {
            label = bold.textPort();
        });
        div.el('i', null, (i) => {
            len = i.textPort();
        });
    });
    return { label, len, click };
}

/** What the outside world may do to one card, whichever form built it. */
interface TCardOut {
    setName(value: string): void;
    toggle(): void;
}

const CARD_SCHEMA = createExoSchema(buildCard);
const CP = CARD_SCHEMA.ports;

type TMachineInstance = TExoComputedMachineNode;

/**
 * THE MACHINE HALF. Declared once, at module load — but built per test around its own log, because
 * the log is what the parity assertion reads and a shared one would carry between cases.
 *
 * IT IS A DECORATED MACHINE, because a field is what it declares: `createExoMachineBuilder` is the engine —
 * numbered slots, handlers, effects with no dependency list — and `field`, `derive` and `effectOn`
 * are `withExoComputedMachine`'s. The wire half below reaches the same three through the block.
 *
 * `startsAt` IS A PARAMETER OF THIS FACTORY AND NOT A PROP OF THE COMPONENT — it is read once, where
 * the field is declared, and the component it builds takes nothing. A case that wants the value to
 * arrive from outside instead passes `''` here and fires `out(…).setName(…)`, which is the init
 * transition.
 */
function makeMachineCard(
    log: string[],
    startsAt: string
): {
    component: TExoComputedMachine<TExoComputedMachineNode>;
    out: (c: TMachineInstance) => TCardOut;
} {
    const m = withExoComputedMachine(createExoMachineBuilder<TExoComputedMachineNode>(CARD_SCHEMA));
    const name = m.field(startsAt);
    const open = m.field(false);
    const visible = m.field('');

    m.derive(visible, [name, open], (name, open) => {
        log.push(`visible ${name}/${open}`);
        return open ? name : name.slice(0, 3);
    });
    m.derive(CP.label, [visible], (visible) => {
        log.push(`label ${visible}`);
        return visible;
    });
    m.derive(CP.len, [visible], (visible) => {
        log.push(`len ${visible}`);
        return `${visible.length}`;
    });
    m.effectOn([name], (c) => {
        const at = name.get(c);
        log.push(`start ${at}`);
        return (): void => {
            log.push(`stop ${at}`);
        };
    });

    const component = m.done();
    const setName = exoTransition<TMachineInstance, string>(component, (c, value) =>
        name.set(c, value)
    );
    const toggle = exoTransition<TMachineInstance>(component, (c) => open.set(c, !open.get(c)));
    // DECLARED AFTER `done()` AND THEREFORE THROUGH A WRAPPER — the machine cannot name `toggle`
    // where it declares its ports, because `toggle` does not exist until the program is compiled.
    // The wire form's whole answer to this is that its transitions come first; see the other half.
    return {
        component,
        out: (c) => ({
            setName: (value: string): void => {
                setName(c, value);
            },
            toggle: (): void => {
                toggle(c);
            },
        }),
    };
}

/**
 * THE WIRE HALF — the same component, declared inside the wire.
 *
 * `startsAt` IS A PARAMETER OF THIS FACTORY, exactly as it is of the machine half's: a component
 * takes nothing, so a value from outside is read where the field is DECLARED and costs the first
 * fill and nothing else. A case that wants it to arrive later passes `''` and fires an init
 * transition at the exonode `c.one` hands back.
 */
function makeWireCard(log: string[], startsAt: string) {
    return createExoTestMachine<TCardPorts, TExoDomNode, TCardOut>(buildCard, (P) =>
        exoWiring<TExoDomNode, TCardOut>((w, c) => {
            const name = w.field(startsAt);
            const open = w.field(false);
            const visible = w.field('');

            w.derive(visible, [name, open], (name, open) => {
                log.push(`visible ${name}/${open}`);
                return open ? name : name.slice(0, 3);
            });
            w.derive(P.label, [visible], (visible) => {
                log.push(`label ${visible}`);
                return visible;
            });
            w.derive(P.len, [visible], (visible) => {
                log.push(`len ${visible}`);
                return `${visible.length}`;
            });
            w.effect([name], (c) => {
                const at = name.get(c);
                log.push(`start ${at}`);
                return (): void => {
                    log.push(`stop ${at}`);
                };
            });

            const setName = w.transition((c: TExoDomNode, value: string) => name.set(c, value));
            const toggle = w.transition((c) => open.set(c, !open.get(c)));
            // NAMED DIRECTLY, where the machine above needs `(c) => toggle(c)`.
            c.on(P.click, toggle);

            w.done();
            return { setName, toggle };
        })
    );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// A HOLDER, SO BOTH FORMS CAN BE REACHED THROUGH `c.one`
// ─────────────────────────────────────────────────────────────────────────────────────────────

function buildHolder(b: TExoSchemaCursor): { slot: TExoChildrenPort } {
    let slot!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        slot = ul.childrenPort();
    });
    return { slot };
}

const markup = (parent: HTMLElement): string => parent.innerHTML;

describe('a wiring block and a machine expressing the same component', () => {
    it('produce identical markup and identical derivation runs, at the mount and after every transition', () => {
        const machineLog: string[] = [];
        const wireLog: string[] = [];
        const machine = makeMachineCard(machineLog, 'Alderaan');
        const WIRE_CARD = makeWireCard(wireLog, 'Alderaan');

        // THE MACHINE, reached through `c.one` — two arguments, because a component has no props
        // position at all. What comes back is the exonode.
        let machineOut!: TCardOut;
        const machineHost = host();
        const MACHINE_HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    machineOut = machine.out(
                        c.one(P.slot, machine.component) as unknown as TMachineInstance
                    );
                }
        );
        EXO_BACKEND.render(MACHINE_HOLDER, machineHost);

        // THE WIRE, reached through the same call — and the handle comes BACK out of the exonode's
        // own state, with no box handed down to it.
        let wireOut!: TCardOut;
        const wireHost = host();
        const WIRE_HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    wireOut = c.one(P.slot, WIRE_CARD).readState<TCardOut>();
                }
        );
        EXO_BACKEND.render(WIRE_HOLDER, wireHost);

        expect(markup(wireHost)).toBe(markup(machineHost));
        expect(wireLog).toEqual(machineLog);

        // …AND THE SAME SCRIPT AFTER IT.
        machineOut.toggle();
        wireOut.toggle();
        expect(markup(wireHost)).toBe(markup(machineHost));
        expect(wireLog).toEqual(machineLog);

        machineOut.setName('Bespin');
        wireOut.setName('Bespin');
        expect(markup(wireHost)).toBe(markup(machineHost));
        expect(wireLog).toEqual(machineLog);

        // A write that wakes nothing new must cost the same nothing in both forms.
        machineOut.toggle();
        wireOut.toggle();
        expect(markup(wireHost)).toBe(markup(machineHost));
        expect(wireLog).toEqual(machineLog);
    });

    it('runs each derivation exactly once per commit in both forms', () => {
        const machineLog: string[] = [];
        const wireLog: string[] = [];
        const machine = makeMachineCard(machineLog, '');
        const WIRE_CARD = makeWireCard(wireLog, 'Alderaan');

        // THE INIT TRANSITION, and this is the case that can afford it: both logs are emptied below
        // before anything is asserted, so the extra commit it costs at the mount is not compared.
        let machineOut!: TCardOut;
        const MACHINE_HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    machineOut = machine.out(
                        c.one(P.slot, machine.component) as unknown as TMachineInstance
                    );
                    machineOut.setName('Alderaan');
                }
        );
        EXO_BACKEND.render(MACHINE_HOLDER, host());

        let wireOut!: TCardOut;
        const WIRE_HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    wireOut = c.one(P.slot, WIRE_CARD).readState<TCardOut>();
                }
        );
        EXO_BACKEND.render(WIRE_HOLDER, host());

        machineLog.length = 0;
        wireLog.length = 0;
        // ONE transition writing ONE field: the chain runs, both ports are rewritten, the effect is
        // re-established. Three derivations and one effect, once each, in slot order.
        machineOut.setName('Bespin');
        wireOut.setName('Bespin');
        expect(wireLog).toEqual([
            'visible Bespin/false',
            'label Bes',
            'len Bes',
            'stop Alderaan',
            'start Bespin',
        ]);
        expect(wireLog).toEqual(machineLog);
    });

    it('renders the same markup on the server, where neither form is ever placed', () => {
        const machine = makeMachineCard([], 'Alderaan');
        const WIRE_CARD = makeWireCard([], 'Alderaan');

        // NOTHING IS FIRED AT THIS INSTANCE AND NOTHING CAN BE: `@exodra/string`'s `one` hands back
        // no exonode, so a declared starting value is the only one a server-rendered machine has.
        const MACHINE_HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    c.one(P.slot, machine.component);
                }
        );
        const WIRE_HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    c.one(P.slot, WIRE_CARD);
                }
        );

        // THE WIRE IS TYPED AGAINST THE DOM EXONODE — both holders are, because `c.one`'s DOM
        // signature is what returns a value — and the server's exonode satisfies everything either
        // of them actually calls. The cast is the backend boundary and nothing else.
        expect(EXO_STR.render(WIRE_HOLDER as never)).toBe(EXO_STR.render(MACHINE_HOLDER as never));
    });
});

describe('what the wire form adds', () => {
    it('hands the wire`s return value back out of c.one', () => {
        const CARD = makeWireCard([], 'Alderaan');
        let out!: TCardOut;
        const HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    out = c.one(P.slot, CARD).readState<TCardOut>();
                }
        );
        const parent = host();
        EXO_BACKEND.render(HOLDER, parent);

        expect(typeof out.setName).toBe('function');
        expect(parent.querySelector('b')?.textContent).toBe('Ald');
        out.setName('Bespin');
        expect(parent.querySelector('b')?.textContent).toBe('Bes');
    });

    it('gives every instance its own state, and one instance`s transition moves only its own ports', () => {
        const CARD = makeWireCard([], 'Alderaan');
        const handles: TCardOut[] = [];
        const HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    handles.push(c.one(P.slot, CARD).readState<TCardOut>());
                }
        );
        const first = host();
        const second = host();
        EXO_BACKEND.render(HOLDER, first);
        EXO_BACKEND.render(HOLDER, second);

        handles[0].setName('Bespin');
        expect(first.querySelector('b')?.textContent).toBe('Bes');
        expect(second.querySelector('b')?.textContent).toBe('Ald');
    });

    it('seeds a field where it is declared, so the first paint already shows the seeded value', () => {
        const CARD = makeWireCard([], 'Coruscant');
        const HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    c.one(P.slot, CARD);
                }
        );
        const parent = host();
        EXO_BACKEND.render(HOLDER, parent);
        // Never `''` for a frame, and no second commit to get there.
        expect(parent.querySelector('b')?.textContent).toBe('Cor');
    });

    it('names a transition directly in c.on, with no wrapper', () => {
        const CARD = makeWireCard([], 'Alderaan');
        const HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    c.one(P.slot, CARD);
                }
        );
        const parent = host();
        EXO_BACKEND.render(HOLDER, parent);

        expect(parent.querySelector('b')?.textContent).toBe('Ald');
        (parent.querySelector('div.card') as HTMLElement).click();
        expect(parent.querySelector('b')?.textContent).toBe('Alderaan');
    });

    it('keeps a field nothing reads — declared, written, waking nothing', () => {
        const runs: string[] = [];
        const KEEPER = createExoTestMachine<TCardPorts, TExoDomNode, { bump(): void }>(
            buildCard,
            (P) =>
                exoWiring<TExoDomNode, { bump(): void }>((w, c) => {
                    const shown = w.field('a');
                    // A REF: no derivation, no fill and no effect lists it, so its mark is 0.
                    const kept = w.field(0);

                    w.derive(P.label, [shown], (shown) => {
                        runs.push(`label ${shown}`);
                        return shown;
                    });
                    w.derive(P.len, [shown], (shown) => `${shown.length}`);

                    const bump = w.transition((c) => {
                        kept.set(c, kept.get(c) + 1);
                    });
                    c.on(P.click, bump);
                    w.done();
                    return { bump };
                })
        );
        let out!: { bump(): void };
        const HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    out = c.one(P.slot, KEEPER).readState<{ bump(): void }>();
                }
        );
        EXO_BACKEND.render(HOLDER, host());

        expect(runs).toEqual(['label a']);
        out.bump();
        out.bump();
        // The field moved twice and woke nothing: no derivation re-ran.
        expect(runs).toEqual(['label a']);
    });

    it('drives a children port from a fill, woken only by the field it declared', () => {
        const CHIP = createExoTestMachine<{ text: TExoTextPort }, TExoDomNode>(
            (b) => {
                let text!: TExoTextPort;
                b.el('span', null, (span) => {
                    text = span.textPort();
                });
                return { text };
            },
            (P) =>
                (c, index): void => {
                    c.text(P.text, index);
                }
        );

        const LIST = createExoTestMachine<
            { rows: TExoChildrenPort; head: TExoTextPort },
            TExoDomNode,
            { setExoText(v: string): void; touch(): void }
        >(
            (b) => {
                let rows!: TExoChildrenPort;
                let head!: TExoTextPort;
                b.el('div', null, (div) => {
                    div.el('h1', null, (h1) => {
                        head = h1.textPort();
                    });
                    div.el('ul', null, (ul) => {
                        rows = ul.childrenPort();
                    });
                });
                return { rows, head };
            },
            (P) =>
                exoWiring<TExoDomNode, { setExoText(v: string): void; touch(): void }>((w, c) => {
                    const text = w.field('ab');
                    const other = w.field(0);
                    // THE CHILD LIST IS TAKEN AT DECLARATION, while the exonode is standing on
                    // THIS instance — the moment a machine reaches through `wire`.
                    const childList = w.field(c.childList(P.rows));

                    w.derive(P.head, [text], (text) => text);
                    // `[text]` is the WAKE SET. The child list is read and never listed, which is
                    // what stops a rebuild from depending on the child list "changing".
                    w.fill([text], (c) => {
                        const rows = childList.get(c);
                        const value = text.get(c);
                        for (let k = rows.size; k < value.length; k++) {
                            rows.insert(c.build(CHIP, k));
                        }
                        for (let k = rows.size - 1; k >= value.length; k--) rows.remove(k);
                    });

                    const setExoText = w.transition((c: TExoDomNode, v: string) => text.set(c, v));
                    const touch = w.transition((c) => {
                        other.set(c, other.get(c) + 1);
                    });
                    w.done();
                    return { setExoText, touch };
                })
        );

        let out!: { setExoText(v: string): void; touch(): void };
        const HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    out = c
                        .one(P.slot, LIST)
                        .readState<{ setExoText(v: string): void; touch(): void }>();
                }
        );
        const parent = host();
        EXO_BACKEND.render(HOLDER, parent);

        expect(parent.querySelectorAll('div ul span').length).toBe(2);
        out.setExoText('abcd');
        expect(parent.querySelectorAll('div ul span').length).toBe(4);
        out.setExoText('a');
        expect(parent.querySelectorAll('div ul span').length).toBe(1);
        // A write to a field the fill never declared leaves the list alone.
        out.touch();
        expect(parent.querySelectorAll('div ul span').length).toBe(1);
    });

    it('re-establishes an effect when its key moves, and ends it with the element', () => {
        const log: string[] = [];
        const WATCHER = createExoTestMachine<TCardPorts, TExoDomNode, { setKey(v: number): void }>(
            buildCard,
            (P) =>
                exoWiring<TExoDomNode, { setKey(v: number): void }>((w) => {
                    const key = w.field(1);
                    w.derive(P.label, [key], (key) => `${key}`);
                    w.effect([key], (c) => {
                        const at = key.get(c);
                        log.push(`start ${at}`);
                        return (): void => {
                            log.push(`stop ${at}`);
                        };
                    });
                    const setKey = w.transition((c: TExoDomNode, v: number) => key.set(c, v));
                    w.done();
                    return { setKey };
                })
        );

        let out!: { setKey(v: number): void };
        const HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    out = c.one(P.slot, WATCHER).readState<{ setKey(v: number): void }>();
                }
        );
        const dispose = EXO_BACKEND.render(HOLDER, host());

        expect(log).toEqual(['start 1']);
        out.setKey(2);
        expect(log).toEqual(['start 1', 'stop 1', 'start 2']);
        dispose();
        expect(log).toEqual(['start 1', 'stop 1', 'start 2', 'stop 2']);
    });

    it('reports `mounted` after the element is placed, and false again at teardown', () => {
        const log: string[] = [];
        const LIVE = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const live = w.mounted();
                w.derive(P.label, [live], (live) => (live ? 'yes' : 'no'));
                w.effect([live], (c) => {
                    const on = live.get(c);
                    log.push(`start ${on}`);
                    return (): void => {
                        log.push(`stop ${on}`);
                    };
                });
                w.done();
            })
        );
        const parent = host();
        const dispose = EXO_BACKEND.render(LIVE, parent);

        expect(log).toEqual(['start false', 'stop false', 'start true']);
        expect(parent.querySelector('b')?.textContent).toBe('yes');
        dispose();
        expect(log).toEqual(['start false', 'stop false', 'start true', 'stop true']);
    });

    /**
     * THE WIRE FORM'S BATCHING DOOR. A wire-declared transition settles at the end of its own call —
     * the batch depth came out of both forms — so a block that wants two writes under one commit
     * HOLDS ITS OWN INSTANCE, calls the bodies, and settles once itself.
     *
     * IT IS NOT `exoHold`, AND THE REASON IS WHAT AN INSTANCE CARRIES. `exoHold` is handed the
     * compiled PROGRAM — a component or a bare program — because the thing it parks is that
     * program's wake chains; an instance carries the `state` and `effectStops` rows
     * `TExoComputedMachineNode` declares and no program, and a wiring block compiles its program per
     * SITE and keeps it there. What the block hands out instead is the settler it already is:
     * `w.instance` and `w.settle`, both null until `done()` arms them, and both what a
     * wire-declared transition itself goes through. A block's program installs no chains, so there
     * is nothing to park and "write, write, settle" IS the hold — which is the whole of the
     * difference from the machine spelling.
     */
    it('coalesces two writes of one instance into a single commit inside a hold', () => {
        const runs: string[] = [];
        const PAIR = createExoTestMachine<
            TCardPorts,
            TExoDomNode,
            { setA(v: string): void; both(x: string, y: string): void }
        >(buildCard, (P) =>
            exoWiring<TExoDomNode, { setA(v: string): void; both(x: string, y: string): void }>(
                (w) => {
                    const a = w.field('a');
                    const b = w.field('b');
                    w.derive(P.label, [a, b], (a, b) => {
                        runs.push(`${a}${b}`);
                        return `${a}${b}`;
                    });
                    // THE BODIES, NAMED — and one of them also declared as a transition, so the
                    // test can show the two spellings side by side on one instance.
                    const applyA = (c: TExoDomNode, v: string): void => a.set(c, v);
                    const applyB = (c: TExoDomNode, v: string): void => b.set(c, v);
                    const setA = w.transition(applyA);
                    w.done();
                    const both = (x: string, y: string): void => {
                        const enode = w.instance;
                        const settle = w.settle;
                        if (enode === null || settle === null) {
                            throw new Error('the block never armed');
                        }
                        applyA(enode, x);
                        applyB(enode, y);
                        settle(enode);
                    };
                    return { setA, both };
                }
            )
        );
        let out!: { setA(v: string): void; both(x: string, y: string): void };
        const HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    out = c.one(P.slot, PAIR).readState<{
                        setA(v: string): void;
                        both(x: string, y: string): void;
                    }>();
                }
        );
        const parent = host();
        EXO_BACKEND.render(HOLDER, parent);

        expect(runs).toEqual(['ab']);
        out.both('x', 'y');
        expect(runs).toEqual(['ab', 'xy']);
        expect(parent.querySelector('b')?.textContent).toBe('xy');

        // AND THE TRANSITION BESIDE IT STILL COMMITS ON ITS OWN, which is what a hold is needed for
        // in the first place: two of these would have run the derivation twice.
        out.setA('z');
        expect(runs).toEqual(['ab', 'xy', 'zy']);
        expect(parent.querySelector('b')?.textContent).toBe('zy');
    });
});

describe('what a wiring block refuses', () => {
    it('refuses a block that never called done()', () => {
        const LOST = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const name = w.field('a');
                w.derive(P.label, [name], (name) => name);
            })
        );
        expect(() => EXO_BACKEND.render(LOST, host())).toThrow(/never called done\(\)/);
    });

    it('refuses done() twice', () => {
        const TWICE = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const name = w.field('a');
                w.derive(P.label, [name], (name) => name);
                w.done();
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(TWICE, host())).toThrow(/done\(\) was called twice/);
    });

    it('refuses a declaration made after done()', () => {
        const LATE = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const name = w.field('a');
                w.derive(P.label, [name], (name) => name);
                w.done();
                w.field('b');
            })
        );
        expect(() => EXO_BACKEND.render(LATE, host())).toThrow(/after done\(\)/);
    });

    it('refuses a derivation that reads nothing, at the first instance', () => {
        const IDLE = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                w.derive(P.label, [], () => 'x');
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(IDLE, host())).toThrow(/reads no field/);
    });

    it('refuses an order that is not topological, at the first instance', () => {
        const BACKWARDS = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const a = w.field('a');
                const b = w.field('b');
                // Reads `b` and is declared BEFORE the derivation that stores it.
                w.derive(P.label, [b], (b) => b);
                w.derive(b, [a], (a) => a);
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(BACKWARDS, host())).toThrow(/not topological/);
    });

    it('refuses a SECOND instance that declares a different number of slots', () => {
        let first = true;
        const FORKED = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const name = w.field('a');
                w.derive(P.label, [name], (name) => name);
                if (first) {
                    first = false;
                } else {
                    w.derive(P.len, [name], (name) => `${name.length}`);
                }
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(FORKED, host())).not.toThrow();
        expect(() => EXO_BACKEND.render(FORKED, host())).toThrow(/no compiled slot for it/);
    });

    it('refuses a SECOND instance that declares its derivations for different addresses', () => {
        let first = true;
        const SWAPPED = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const name = w.field('a');
                const order = first ? [P.label, P.len] : [P.len, P.label];
                first = false;
                w.derive(order[0], [name], (name) => name);
                w.derive(order[1], [name], (name) => `${name.length}`);
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(SWAPPED, host())).not.toThrow();
        expect(() => EXO_BACKEND.render(SWAPPED, host())).toThrow(
            /does not match the one the first instance declared/
        );
    });

    it('refuses a SECOND instance that reads the SAME fields in a different ORDER', () => {
        // THE HOLE THIS PINS. The read list was compared by LENGTH alone, so two lists of the same
        // two fields in opposite orders passed every check — and the compute this instance registers
        // is bound against the FIRST instance's array, so a body written for `(name, open)` is called
        // with `(open, name)`. A boolean lands where a string is expected, and nothing anywhere says
        // so: the port simply carries the wrong text.
        let first = true;
        const REORDERED = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const head = w.field('a');
                const tail = w.field('b');
                const reads = first ? [head, tail] : [tail, head];
                first = false;
                w.derive(P.label, reads, (...values: string[]) => `${values[0]}${values[1]}`);
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(REORDERED, host())).not.toThrow();
        // POINTED AT THE HEAD, NOT AT THE PARAGRAPH. This used to match "reading the same fields
        // in the same order", which since the prose split lives ONLY in the dev-only tail — so the
        // assertion passed under vitest and would have passed against a production build for a
        // reordered read list, a wrong address, or anything else that refuses at this slot. The
        // head now names WHICH of the two disagreed, and that is what is matched here: a
        // production build has to still be able to tell a reordered list from a moved address.
        expect(() => EXO_BACKEND.render(REORDERED, host())).toThrow(
            /derivation 0 does not match the one the first instance declared at that slot: a different read list/
        );
    });

    it('refuses a SECOND instance whose EFFECT reads a different field of the same count', () => {
        // THE SAME HOLE ON THE OTHER TABLE, and worse in one way: a fill's and an effect's list is
        // the WAKE SET, and the masks were inverted from the FIRST instance's — so this instance
        // would have been woken by a field it never named, for the life of the page.
        let first = true;
        const WOKEN = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const name = w.field('a');
                const other = w.field(0);
                w.derive(P.label, [name], (name) => name);
                w.effect([first ? name : other], () => null);
                first = false;
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(WOKEN, host())).not.toThrow();
        // POINTED AT THE HEAD — see the derivation twin above for why. The other disagreement this
        // slot can report is a different KIND (a fill where an effect stood), so matching the read
        // list by name is what keeps this test about the WAKE SET.
        expect(() => EXO_BACKEND.render(WOKEN, host())).toThrow(
            /effect 0 does not match the declaration the first instance made at that slot: a different read list/
        );
    });

    it('refuses a SECOND instance that declares mounted() where the first declared a plain field', () => {
        // THE HOLE THIS PINS. `mounted()` refused only a DIFFERENT ROW, so an instance putting the
        // field at the same row an earlier one had used for an ordinary boolean passed everything:
        // the counts agree, the handle already exists, and `site.mountedRow` simply moved off -1.
        // The instances that came first never registered a `setMounted`, so `mounted` was
        // permanently false for those rows of a list and correct for the rest.
        let first = true;
        const LATECOMER = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const flag = first ? w.field(false) : w.mounted();
                first = false;
                w.derive(P.label, [flag], (flag) => (flag ? 'yes' : 'no'));
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(LATECOMER, host())).not.toThrow();
        expect(() => EXO_BACKEND.render(LATECOMER, host())).toThrow(
            /by this instance and by no earlier one/
        );
    });

    it('refuses a SECOND instance that does NOT declare mounted() where the first did', () => {
        // THE MIRROR, AND NO DECLARATION METHOD CAN SEE IT — the method that would complain is the
        // one that is never called. Left open, `done()` builds a `setMounted` for this instance
        // anyway, pointing at the row where its author declared an ordinary boolean, and the engine
        // writes `true` into it at the placement. The refusal is in `done()` for that reason.
        let first = true;
        const DESERTER = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const flag = first ? w.mounted() : w.field(false);
                first = false;
                w.derive(P.label, [flag], (flag) => (flag ? 'yes' : 'no'));
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(DESERTER, host())).not.toThrow();
        expect(() => EXO_BACKEND.render(DESERTER, host())).toThrow(/did not declare mounted\(\)/);
    });

    it('refuses a transition fired before the block armed', () => {
        let escaped!: () => void;
        const LEAKY = createExoTestMachine<TCardPorts, TExoDomNode>(buildCard, (P) =>
            exoWiring<TExoDomNode>((w) => {
                const name = w.field('a');
                w.derive(P.label, [name], (name) => name);
                escaped = w.transition((c) => name.set(c, 'b'));
                // Fired here, one line before the block arms.
                escaped();
                w.done();
            })
        );
        expect(() => EXO_BACKEND.render(LEAKY, host())).toThrow(/fired before its wiring block/);
        // Declared and never usable, which is the point: the refusal names `done()`.
        expect(typeof escaped).toBe('function');
    });
});
