import { composeExoPlugins } from '@exodra/core';
// @vitest-environment jsdom
import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoMachine,
    TExoEventHandler,
    TExoEventPort,
    TExoPort,
    TExoTextPort,
    TExoAttrPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { createExoDelegatedListener } from '../factories/createExoDelegatedListener';
import { exoEventSlotsFor } from '../exoEventSlotsFor';

import { createExoDelegatedEvents } from '../factories/createExoDelegatedEvents';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoCompilerApi, TExoDomBackend } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/** The smallest thing that satisfies the writable half of the observable protocol. */
type TCell<TValue> = {
    getValue(): TValue;
    setValue(next: TValue): void;
    onChange(): () => void;
};

function cell<TValue>(value: TValue): TCell<TValue> {
    let held = value;
    return {
        getValue: () => held,
        setValue: (next: TValue) => {
            held = next;
        },
        onChange: () => () => undefined,
    };
}

type TItem = { done: TCell<boolean>; count: TCell<number>; text: TCell<string> };

const item = (): TItem => ({ done: cell(false), count: cell(0), text: cell('') });

/** What a wiring function sees. Typed structurally so the test needs no `any`. */
type TNode = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
};

/** The same, for the one wire in this file that builds a LIST of rows rather than filling one. */
type TListing = {
    list(port: TExoPort, component: TExoMachine<never>, params: readonly unknown[]): void;
};

function buildRow(b: TExoSchemaCursor) {
    let click!: TExoEventPort;
    let label!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        li.el('button', { class: 'btn' }, (btn) => {
            click = btn.eventPort('click');
            label = btn.textPort();
        });
    });
    return { click, label };
}

type TRowPorts = ReturnType<typeof buildRow>;

/**
 * A ROW WHOSE EVENT PORT CARRIES AN ARBITRARY NAME, and the reason it exists.
 *
 * Both name refusals — the non-bubbling one and the high-frequency one — used to fire when the
 * PACK was built, so a case could assert them with `createExoDelegatedEvents(['focus'])` and nothing
 * else. They now fire when a SCHEMA declares a port with that name, which refuses exactly the
 * broken programs instead of a superset of them. So every one of those cases has to build a real
 * component and render it, and that is what this makes cheap.
 */
const rowNamed = (event: string) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let port!: TExoEventPort;
            b.el('li', null, (li) => {
                port = li.eventPort(event);
            });
            return { port };
        },
        (P): TExoMachineInitialState<TNode> =>
            (c) => {
                c.on(P.port, TOGGLE_DONE, item());
            }
    );

/**
 * Renders a schema declaring `event` through a pack that lists it — the shape both refusals need.
 *
 * A BACKEND PER CALL is deliberate here and is the one place in this file it is: the pack under
 * test is built from this call's own arguments, so there is nothing to hoist. Every call also
 * builds a fresh declaration, so nothing is being recompiled — each render is the first for its
 * (declaration, backend) pair.
 */
const renderNamed = (event: string, options?: { allowHighFrequency: boolean }): void => {
    const backend = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
        events: () => createExoDelegatedEvents([event], options),
    });
    backend.render(rowNamed(event), host());
};

/**
 * ONE SHAPE; each case is the COMPONENT built from it with the wiring that case is about.
 *
 * The same value is rendered, served and hydrated in the cases that do all three, so nothing
 * here can attach one wiring in the browser and print another on the server — which is what
 * two separate arguments allowed.
 */
const rowWith = (make: (ports: TRowPorts) => TExoMachineInitialState<TNode>) =>
    createExoTestMachine(buildRow, make);

/**
 * `n` INSTANCES OF ONE ROW, AS A LIST — which is how an application makes several instances of a
 * component, and therefore how the cases below make them. Row `at` is handed the number `at` as
 * its params, so every case still asks its question of a row that knows which one it is.
 *
 * THE `<ul>` IS NOT DECORATION: a children port has to live on an element. It is part of the markup
 * BOTH backends print, so the parity assertions still compare like with like — and it sits inside
 * the delegated root, so the walk from a button reaches that root exactly as before.
 */
const listOf = <TPorts>(row: TExoMachine<TNode, TPorts>, n: number) => {
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
                    Array.from({ length: n }, (_, at) => at)
                );
            }
    );
};

const clickOn = (node: Element): void => {
    node.dispatchEvent(new Event('click', { bubbles: true }));
};

/** ONE pack for the whole file — the strategy the backend below is composed from. */
const DELEGATED = createExoDelegatedEvents(['click']);

/**
 * ONE BACKEND FOR THAT PACK, built here rather than per case: the BACKEND is the schema cache key
 * and it is compared by pointer, so a fresh one inside a case would recompile every schema it
 * renders — markup parse included — and would be a different key from the one the case before it
 * measured. Composing `events` is the whole of what makes it different from `EXO_BACKEND`.
 */
const DELEGATED_BACKEND = composeExoPlugins(
    withExoHydration(withExoCompiler(new ExoDomBackend())),
    {
        events: () => DELEGATED,
    }
);

/** ONE handler for the whole file — which is the entire claim being tested. */
const TOGGLE_DONE: TExoEventHandler<Event, Element> = function (_event, subject) {
    const done = (subject as TItem).done;
    done.setValue(done.getValue() === true ? false : true);
};

const BUMP: TExoEventHandler<Event, Element> = function (_event, subject) {
    const count = (subject as TItem).count;
    count.setValue(count.getValue() + 1);
};

describe('handlers that read their subject', () => {
    it('set a constant and apply a pure update, with the element in hand', () => {
        const SET_TEXT: TExoEventHandler<Event, Element> = function (_event, subject) {
            (subject as TItem).text.setValue('chosen');
        };
        const TAKE_LABEL: TExoEventHandler<Event, Element> = function (_event, subject) {
            (subject as TItem).text.setValue(this.textContent ?? '');
        };

        const one = item();
        const SETTER = rowWith((P) => (c) => {
            c.text(P.label, 'a');
            c.on(P.click, SET_TEXT, one);
        });
        const first = host();
        EXO_BACKEND.render(SETTER, first);
        clickOn(first.querySelectorAll('button')[0]);
        expect(one.text.getValue()).toBe('chosen');

        const two = item();
        const BUMPER = rowWith((P) => (c) => {
            c.text(P.label, 'b');
            c.on(P.click, BUMP, two);
        });
        const second = host();
        EXO_BACKEND.render(BUMPER, second);
        const bumpButton = second.querySelectorAll('button')[0];
        clickOn(bumpButton);
        clickOn(bumpButton);
        // Read at DISPATCH time from the same cell it writes — not from a value captured when
        // the row rendered, which is what makes two clicks worth two.
        expect(two.count.getValue()).toBe(2);

        const three = item();
        const TAKER = rowWith((P) => (c) => {
            c.text(P.label, 'from the node');
            c.on(P.click, TAKE_LABEL, three);
        });
        const third = host();
        EXO_BACKEND.render(TAKER, third);
        clickOn(third.querySelectorAll('button')[0]);
        expect(three.text.getValue()).toBe('from the node');
    });

    it('no longer reach the port’s own setter once a cast has got past on()’s type', () => {
        // `on(port: TExoEventPort, …)` is the whole refusal now; `packages/type-tests`'
        // `port-kind-doors.ts` offers it a text port and is rejected there. A cast still arrives
        // here — and `on` no longer indexes the setter table at all, so it arrives at the events
        // pack with `schema.writeData[index]`, which a text port leaves `null`. It fails there
        // instead of writing the function's source into the button as text.
        const ROW = rowWith((P) => (c) => {
            c.on(P.label as unknown as TExoEventPort, TOGGLE_DONE, item());
        });
        const parent = host();
        expect(() => EXO_BACKEND.render(ROW, parent)).toThrow();
        expect(parent.textContent ?? '').not.toContain('function');
    });

    it('are refused by the event port’s setter slot when a cast fills it as an attribute', () => {
        // THE OTHER DIRECTION of the same cast: `on` has left the setter table, so what that
        // table holds for an event port is a refusal, and `attr`/`bind` land on it. Silently
        // attaching would have been the alternative, and `class="function (event, subject) …"`
        // the one before that.
        const ROW = rowWith((P) => (c) => {
            c.attr(P.click as unknown as TExoAttrPort, TOGGLE_DONE);
        });
        expect(() => EXO_BACKEND.render(ROW, host())).toThrow(/c\.on\(port, handler, subject\)/);

        const before = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            expect(() => EXO_BACKEND.render(ROW, host())).toThrow('EXO0090');
        } finally {
            if (before === undefined) delete process.env.NODE_ENV;
            else process.env.NODE_ENV = before;
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// A FUNCTION HANDLER IS TOLD ITS SUBJECT TOO
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * `on(port, handler, subject)` ALWAYS TOOK THREE ARGUMENTS, and the third once did nothing at
 * all when the handler was a function: the fill stored it on the element (both slots,
 * no branch — see `exo-event-slot-setter`) and `direct-listener-for` dropped it on the
 * function branch. A documented parameter that was silently discarded.
 *
 * What it costs to drop it is not politeness. "A closure already knows its row" is only true of a
 * closure BUILT for that row, so every caller with per-instance handlers had to allocate one
 * function per handler per instance to carry which instance a dispatch was about —
 * a machine's wire said exactly that in a comment. A function that is TOLD its row can be a
 * module-level constant.
 *
 * These cases pin the three facts a caller needs: each instance's own subject arrives, a fill
 * with no subject still dispatches and passes `undefined`, and `this` is still the element.
 */
describe('a function handler', () => {
    /** What one dispatch was told. `self` is `this`, kept as `unknown` so the case asserts it. */
    type TTold = { readonly subject: unknown; readonly self: unknown };

    const told: TTold[] = [];

    /**
     * ONE FUNCTION FOR EVERY ROW OF EVERY CASE BELOW — a module-level constant, which is the
     * whole claim. It holds nothing about any instance, so its identity is what proves no
     * per-row function was needed: `toBe` on the recorded handler would fail against a wire that
     * built one per row.
     */
    const RECORD = function (this: Element, _event: Event, subject?: unknown): void {
        told.push({ subject, self: this });
    };

    it('is told which row it fired for, so ONE module-level function serves every row', () => {
        told.length = 0;
        const items = [item(), item(), item()];
        const ROW = rowWith((P) => (c, at) => {
            c.text(P.label, 'row ' + at);
            c.on(P.click, RECORD, items[at as number]);
        });
        const parent = host();
        EXO_BACKEND.render(listOf(ROW, 3), parent);

        const buttons = parent.querySelectorAll('button');
        clickOn(buttons[2]);
        clickOn(buttons[0]);

        expect(told).toHaveLength(2);
        // EACH ROW'S OWN SUBJECT, by identity — out of the slot on its own element.
        expect(told[0].subject).toBe(items[2]);
        expect(told[1].subject).toBe(items[0]);
        // AND `this` IS STILL THE ELEMENT the listener was attached to. The subject is a second
        // argument, not a replacement for the receiver.
        expect(told[0].self).toBe(buttons[2]);
        expect(told[1].self).toBe(buttons[0]);
    });

    it('gets `undefined` when the fill named no subject, and still fires', () => {
        told.length = 0;
        const ROW = rowWith((P) => (c) => {
            c.text(P.label, 'no subject');
            c.on(P.click, RECORD);
        });
        const parent = host();
        EXO_BACKEND.render(ROW, parent);
        const button = parent.querySelectorAll('button')[0];
        clickOn(button);

        expect(told).toHaveLength(1);
        // NOT A REFUSAL: a handler is entitled to ignore the parameter.
        expect(told[0].subject).toBeUndefined();
        expect(told[0].self).toBe(button);
    });

    it('keeps every promise made to the one-parameter shape every wire wrote before', () => {
        const hits: unknown[] = [];
        const ROW = rowWith((P) => (c) => {
            c.text(P.label, 'old shape');
            // DECLARED WITH ONE PARAMETER, called with two. That is not an error in JavaScript
            // and is not observable to this body, which is the whole of why nothing written
            // before this change needs a line.
            c.on(P.click, function (this: Element, event: Event): void {
                hits.push(this);
                hits.push(event.type);
            });
        });
        const parent = host();
        EXO_BACKEND.render(ROW, parent);
        const button = parent.querySelectorAll('button')[0];
        clickOn(button);

        expect(hits).toEqual([button, 'click']);
    });

    it('is served the same way after hydration, out of the same setter object', () => {
        told.length = 0;
        const items = [item(), item()];
        const ROW = rowWith((P) => (c, at) => {
            c.text(P.label, 'row ' + at);
            c.on(P.click, RECORD, items[at as number]);
        });
        const LIST = listOf(ROW, 2);
        const parent = host();
        parent.innerHTML = EXO_STR.render(LIST);
        EXO_BACKEND.hydrate(LIST, parent);

        const buttons = parent.querySelectorAll('button');
        clickOn(buttons[1]);

        expect(told).toHaveLength(1);
        expect(told[0].subject).toBe(items[1]);
        expect(told[0].self).toBe(buttons[1]);
    });
});

describe('the delegated strategy', () => {
    it('serves a thousand rows from one listener on the root', () => {
        const items: TItem[] = [];
        for (let i = 0; i < 1000; i++) items.push(item());
        const ROW = rowWith((P) => (c, at) => {
            c.text(P.label, 'row ' + at);
            c.on(P.click, TOGGLE_DONE, items[at as number]);
        });
        const parent = host();
        const dispose = DELEGATED_BACKEND.render(listOf(ROW, 1000), parent);

        const buttons = parent.querySelectorAll('button');
        clickOn(buttons[907]);
        expect(items[907].done.getValue()).toBe(true);
        expect(items[906].done.getValue()).toBe(false);

        // THE PROOF THAT NOTHING WAS ATTACHED PER ELEMENT: disposing the render removes the
        // ROOT's listeners and nothing else, so if the button had one of its own it would keep
        // working here.
        dispose();
        clickOn(buttons[906]);
        expect(items[906].done.getValue()).toBe(false);
    });

    it('produces the same markup as the direct strategy', () => {
        const items = [item(), item()];
        const ROW = rowWith((P) => (c, at) => {
            c.text(P.label, 'row ' + at);
            c.on(P.click, TOGGLE_DONE, items[at as number]);
        });
        const direct = host();
        const delegated = host();
        const LIST = listOf(ROW, 2);
        EXO_BACKEND.render(LIST, direct);
        DELEGATED_BACKEND.render(LIST, delegated);

        expect(delegated.innerHTML).toBe(direct.innerHTML);
        expect(delegated.innerHTML).toBe(EXO_STR.render(LIST));
    });

    it('does not run a directly-served element twice inside a delegated root', () => {
        // THE MIXED PAGE. The inner subtree carries its own listener AND sits under a root
        // that is dispatching the same event name, so a shared slot format would find the
        // handler twice — a bump of 2, or a toggle that looks like nothing happened.
        const one = item();
        const root = host();
        const OUTER = rowWith((P) => (c) => {
            c.text(P.label, 'outer');
            c.on(P.click, TOGGLE_DONE, item());
        });
        DELEGATED_BACKEND.render(OUTER, root);

        const inner = document.createElement('div');
        root.appendChild(inner);
        const INNER = rowWith((P) => (c) => {
            c.text(P.label, 'inner');
            c.on(P.click, BUMP, one);
        });
        EXO_BACKEND.render(INNER, inner);

        clickOn(inner.querySelectorAll('button')[0]);
        expect(one.count.getValue()).toBe(1);
    });

    it('refuses a closure, naming the event and the way out', () => {
        const ROW = rowWith((P) => (c) => {
            c.text(P.label, 'x');
            c.on(P.click, () => undefined);
        });
        expect(() => DELEGATED_BACKEND.render(ROW, host())).toThrow(/"click".*delegated/s);
    });

    // THIS IS THE POINT OF THE WHOLE CASE, and it is here because for a while it was false.
    //
    // Both refusals in `createExoDelegatedEvents` used to be written
    // `if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && COND)`,
    // and in this repository that spelling does not strip a MESSAGE — the `define` folds
    // `NODE_ENV` to "production" and the minifier deletes THE WHOLE CONDITION. So a production
    // build accepted `focus` in a delegated pack in silence and shipped a page whose handler
    // could never fire.
    //
    // The argument for stripping was that a pack's list is a literal written at module level
    // and a typo in it is caught by the first local load. That holds for a literal and not for
    // a pack assembled from DATA — a config, a plugin registry, a list a host application
    // composes — where the name is not settled before the program ships.
    //
    // Keeping the check costs one `Set.has` per event name, once per pack, once per process
    // (`createExoDelegatedEvents` is called by the application in a plugin provider; nothing inside
    // this package calls it in a loop — read off the call sites, not assumed).
    it('STILL refuses under production, printing the code and the port name, and the sentence in development', () => {
        // The other side of the same change: the check ships, the explanation does not. What must
        // survive is the code and the offending name — a pack can be assembled from a config, so a
        // production console that named neither would leave a reader nothing to search for.
        const before = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        let short = '';
        try {
            try {
                renderNamed('focus');
            } catch (e) {
                short = (e as Error).message;
            }
            expect(() => renderNamed('pointermove')).toThrow(/EXO0052 "pointermove"/);
        } finally {
            if (before === undefined) delete process.env.NODE_ENV;
            else process.env.NODE_ENV = before;
        }
        let long = '';
        try {
            renderNamed('focus');
        } catch (e) {
            long = (e as Error).message;
        }

        expect(short).toBe('EXO0051 "focus"');
        expect(short).not.toContain('focusin');
        expect(long).toContain('createExoDelegatedEvents');
        expect(long).toContain('"focus"');
        expect(long).toContain('does not bubble');
        expect(long.length).toBeGreaterThan(short.length);
        expect(long).toContain('focusin');
    });

    it('refuses the media events, which are the bulk of the non-bubbling names', () => {
        // A `<video>` dispatches every one of these at the element and no further, so a
        // delegated pack that accepted them built a player whose controls were all dead and
        // said nothing. `invalid` and the dialog pair are the same shape.
        for (const name of [
            'play',
            'pause',
            'ended',
            'timeupdate',
            'volumechange',
            'loadedmetadata',
            'canplay',
            'seeked',
            'invalid',
            'close',
            'beforetoggle',
            'scrollend',
        ]) {
            expect(() => renderNamed(name)).toThrow(/does not bubble/);
        }
    });

    it('accepts `cancel` and `slotchange`, which BUBBLE and were false entries', () => {
        // Both were on the non-bubbling list and both bubble, so both were
        // refusals of programs that work. While the check was dev-only that cost one dead port on
        // a developer's machine; the check now runs in production, where it cost an application
        // its boot — a blank page for a name the app might never have used.
        //
        //   `cancel`     — TWO events share the name. `<dialog>`'s does not bubble;
        //                  `<input type="file">`'s does, and fires when the user dismisses the
        //                  picker. One delegated handler over many file inputs is exactly the
        //                  case delegation exists for.
        //   `slotchange` — the DOM standard fires it with `bubbles` set to true.
        //
        // Pinned as ACCEPTED rather than deleted from the suite, so that re-adding either name to
        // `EXO_NON_BUBBLING_EVENTS` fails here and has to argue with the sources in that file's
        // header instead of looking like a completeness fix.
        expect(() => renderNamed('cancel')).not.toThrow();
        expect(() => renderNamed('slotchange')).not.toThrow();
    });

    it('refuses a port whose event the pack does not listen for', () => {
        const INPUT_ONLY = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
            events: () => createExoDelegatedEvents(['input']),
        });
        const ROW = rowWith((P) => (c) => {
            c.text(P.label, 'x');
            c.on(P.click, TOGGLE_DONE, item());
        });
        expect(() => INPUT_ONLY.render(ROW, host())).toThrow(/only listens for/);
    });

    it('STILL refuses it under NODE_ENV=production, and prints EXO0002 with the port name', () => {
        // THE OTHER HALF OF THE CODED REFUSAL, and the half no source-shape gate can assert.
        // `@exodra/core`'s `error-code-registry.test.ts` reads this file's TEXT and can tell that
        // `EXO0002` is the short branch of the accepted guard with no NODE_ENV branch around the
        // throw. Whether the program still refuses is a question only a run answers.
        //
        // THE EVENT NAME IS ASSERTED, not just the code. It is the appended payload and the
        // registry row promises a reader it is there; without it a production console says that
        // SOME port did not match SOME pack, which on a page whose pack was built from a config is
        // the whole of what they would have to go on.
        //
        // A fresh backend and a fresh component per call, because a schema is cached per
        // (declaration, backend) and a case that reused either would be asserting against whatever
        // the case above left behind.
        const refuse = (): void => {
            const INPUT_ONLY = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
                events: () => createExoDelegatedEvents(['input']),
            });
            const ROW = rowWith((P) => (c) => {
                c.text(P.label, 'x');
                c.on(P.click, TOGGLE_DONE, item());
            });
            INPUT_ONLY.render(ROW, host());
        };

        const before = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        let short = '';
        try {
            try {
                refuse();
            } catch (e) {
                short = (e as Error).message;
            }
        } finally {
            if (before === undefined) delete process.env.NODE_ENV;
            else process.env.NODE_ENV = before;
        }

        expect(short).toBe('EXO0002 "click"');

        // The development build's message is the same refusal with its sentence intact — the code
        // REPLACES the prose, it is not a second and differently-shaped failure.
        let long = '';
        try {
            refuse();
        } catch (e) {
            long = (e as Error).message;
        }
        expect(long).toContain('"click"');
        expect(long).toContain('only listens for');
        expect(long.length).toBeGreaterThan(short.length);
    });
});

/** The same shape as `buildRow`, with the port on a name from the high-frequency list. */
function buildMover(b: TExoSchemaCursor) {
    let move!: TExoEventPort;
    let label!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        li.el('button', { class: 'btn' }, (btn) => {
            move = btn.eventPort('pointermove');
            label = btn.textPort();
        });
    });
    return { move, label };
}

type TMoverPorts = ReturnType<typeof buildMover>;

const moverWith = (make: (ports: TMoverPorts) => TExoMachineInitialState<TNode>) =>
    createExoTestMachine(buildMover, make);

/**
 * THE SECOND REFUSAL, WHICH IS NOT THE FIRST ONE.
 *
 * `EXO_NON_BUBBLING_EVENTS` is about a handler that can never fire; this is about one that fires
 * at the pointer's sampling rate and walks to the root every time. The pair of lists only helps
 * if they stay apart, so what is asserted below is mostly the SEPARATION: the opt-in lifts one
 * refusal and not the other, and a name in neither list is untouched by either.
 */
describe('the high-frequency refusal', () => {
    /** Every name in the list, refused by default, each one naming itself. */
    it('refuses the continuous pointer stream by default', () => {
        for (const name of [
            'mousemove',
            'pointermove',
            'pointerrawupdate',
            'touchmove',
            'wheel',
            'mousewheel',
            'drag',
            'dragover',
        ]) {
            expect(() => renderNamed(name)).toThrow(
                new RegExp(`"${name}".*allowHighFrequency`, 's')
            );
        }
    });

    it('says why it is refused, and does not borrow the non-bubbling wording', () => {
        // The failure this guards is a message that sends an author to look for a bubbling
        // twin of `pointermove`, which does not exist and is not the problem.
        let message = '';
        try {
            renderNamed('pointermove');
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).toContain('bubbles');
        expect(message).not.toContain('does not bubble');
        expect(message).toContain('allowHighFrequency');
    });

    it('builds a pack that really dispatches the name it accepted', () => {
        // Not throwing is not the claim — the claim is that the opt-in produces a WORKING
        // delegated pack, so the accepted name has to reach a handler through the root.
        const moved = item();
        const MOVER = moverWith((P) => (c) => {
            c.text(P.label, 'drag me');
            c.on(P.move, BUMP, moved);
        });
        const parent = host();
        const backend = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
            events: () => createExoDelegatedEvents(['pointermove'], { allowHighFrequency: true }),
        });
        backend.render(MOVER, parent);

        parent
            .querySelectorAll('button')[0]
            .dispatchEvent(new Event('pointermove', { bubbles: true }));
        expect(moved.count.getValue()).toBe(1);
    });

    it('does NOT unlock the non-bubbling list', () => {
        // THE ONE THAT KEEPS THE TWO LISTS APART. Stating an intent cannot make the browser
        // deliver `focus` to a root, so the opt-in must leave that refusal exactly as it was —
        // otherwise the flag buys a dead handler and the message an author gets is the wrong
        // one about the wrong problem.
        for (const name of ['focus', 'scroll', 'mouseenter', 'play', 'loadeddata']) {
            expect(() => renderNamed(name, { allowHighFrequency: true })).toThrow(
                /does not bubble/
            );
        }
    });
});

/**
 * TWO ELEMENTS WITH A HANDLER EACH, one inside the other, so the two strategies can be asked
 * the question that separates them: what happens between the inner handler and the outer one.
 */
function buildNested(b: TExoSchemaCursor) {
    let outer!: TExoEventPort;
    let inner!: TExoEventPort;
    let label!: TExoTextPort;
    b.el('div', { class: 'outer' }, (div) => {
        outer = div.eventPort('click');
        div.el('button', { class: 'inner' }, (btn) => {
            inner = btn.eventPort('click');
            label = btn.textPort();
        });
    });
    return { outer, inner, label };
}

type TNestedPorts = ReturnType<typeof buildNested>;

const nestedWith = (make: (ports: TNestedPorts) => TExoMachineInitialState<TNode>) =>
    createExoTestMachine(buildNested, make);

describe('a page must behave the same under either pack', () => {
    /**
     * THE ONE DIVERGENCE THAT WAS REAL. Per-element listeners are separate registrations, so
     * `stopPropagation()` in the inner handler makes the browser decline to call the outer
     * one. A delegated root has ONE registration and reaches the ancestors by walking, so
     * unless the walk asks, the call does nothing and the outer handler runs anyway — a page
     * that works on the default pack and breaks on the delegated one, which is exactly what a
     * swappable strategy may not do.
     */
    const bumpAndStop: TExoEventHandler<Event, Element> = function (event, subject) {
        event.stopPropagation();
        const count = (subject as TItem).count;
        count.setValue(count.getValue() + 1);
    };

    /**
     * THE STRATEGY IS THE ARGUMENT, and it arrives as the BACKEND it is composed into — the two
     * strategies are now two objects rather than one call with and without a pack, which is the
     * whole shape this describe is comparing.
     */
    const rendersBoth = (
        backend: TExoDomBackend & TExoCompilerApi
    ): { inner: TItem; outer: TItem } => {
        const innerItem = item();
        const outerItem = item();
        const ROW = nestedWith((P) => (c) => {
            c.text(P.label, 'go');
            c.on(P.inner, bumpAndStop, innerItem);
            c.on(P.outer, BUMP, outerItem);
        });
        const parent = host();
        backend.render(ROW, parent);
        clickOn(parent.querySelectorAll('button')[0]);
        return { inner: innerItem, outer: outerItem };
    };

    it('honours stopPropagation under the direct strategy', () => {
        const seen = rendersBoth(EXO_BACKEND);
        expect(seen.inner.count.getValue()).toBe(1);
        expect(seen.outer.count.getValue()).toBe(0);
    });

    it('honours stopPropagation under the delegated strategy too', () => {
        const seen = rendersBoth(DELEGATED_BACKEND);
        expect(seen.inner.count.getValue()).toBe(1);
        // Read 1 before the walk learned to ask `cancelBubble`.
        expect(seen.outer.count.getValue()).toBe(0);
    });

    it('runs BOTH handlers under either pack when nothing stops the bubble', () => {
        // The other side of the same rule, and the reason the walk does not stop at the first
        // match: nesting has to behave identically when propagation is left alone.
        const check = (backend: TExoDomBackend & TExoCompilerApi): [number, number] => {
            const innerItem = item();
            const outerItem = item();
            const ROW = nestedWith((P) => (c) => {
                c.text(P.label, 'go');
                c.on(P.inner, BUMP, innerItem);
                c.on(P.outer, BUMP, outerItem);
            });
            const parent = host();
            backend.render(ROW, parent);
            clickOn(parent.querySelectorAll('button')[0]);
            return [innerItem.count.getValue(), outerItem.count.getValue()];
        };

        expect(check(EXO_BACKEND)).toEqual([1, 1]);
        expect(check(DELEGATED_BACKEND)).toEqual([1, 1]);
    });
});

describe('hydration', () => {
    it('attaches the delegated strategy to markup the server printed', () => {
        const items = [item(), item(), item()];
        const ROW = rowWith((P) => (c, at) => {
            c.text(P.label, 'row ' + at);
            c.on(P.click, TOGGLE_DONE, items[at as number]);
        });
        const parent = host();
        const LIST = listOf(ROW, 3);
        parent.innerHTML = EXO_STR.render(LIST);

        const before = parent.innerHTML;
        DELEGATED_BACKEND.hydrate(LIST, parent);
        // Hydration attaches and writes nothing else — the markup is untouched.
        expect(parent.innerHTML).toBe(before);

        clickOn(parent.querySelectorAll('button')[2]);
        expect(items[2].done.getValue()).toBe(true);
        expect(items[1].done.getValue()).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// `createExoDelegatedListener` CALLED THE WAY THE BARREL SAYS IT IS FOR — by a third pack, directly.
//
// WHY THIS BLOCK EXISTS. `src/index.ts` exports it under a paragraph that makes a specific promise
// to whoever writes a pack of their own: it is "the dispatch semantics a delegated pack must not
// re-derive, since it is where `stopPropagation` is honoured." Until this was written the function
// was named by ZERO tests. It was exercised — `installExoDelegatedRoot` builds one — but only
// through a path that never asks it the question the promise is about.
//
// Everything here is built from the public surface and nothing else: `exoEventSlotsFor` for the
// property names, plain elements, and a hand-made `Event`. That is exactly the position the pack
// author is in.
describe('createExoDelegatedListener, used directly by a third pack', () => {
    /** A subject whose one cell records where the walk went. */
    const trail = () => ({ seen: cell('') });
    const note =
        (what: string, stop = false): TExoEventHandler<Event, Element> =>
        (event, subject) => {
            if (stop) event.stopPropagation();
            const seen = (subject as ReturnType<typeof trail>).seen;
            seen.setValue(seen.getValue() + what);
        };
    /** Puts a handler on an element the way a pack's own setter would. */
    const carry = (
        el: Element,
        slots: ReturnType<typeof exoEventSlotsFor>,
        handler: TExoEventHandler<Event, Element>,
        subject: unknown
    ): void => {
        (el as unknown as Record<symbol, unknown>)[slots.handlerKey] = handler;
        (el as unknown as Record<symbol, unknown>)[slots.subjectKey] = subject;
    };

    it('walks from the target to the root and runs every handler on the way', () => {
        const slots = exoEventSlotsFor('third-pack-walk', 'click');
        const root = host();
        const mid = document.createElement('div');
        const leaf = document.createElement('button');
        root.appendChild(mid);
        mid.appendChild(leaf);
        const t = trail();
        carry(leaf, slots, note('L'), t);
        carry(mid, slots, note('M'), t);
        carry(root, slots, note('R'), t);

        root.addEventListener('click', createExoDelegatedListener(root, slots));
        leaf.dispatchEvent(new Event('click', { bubbles: true }));

        // Root INCLUDED: the loop offers the root a handler before it stops, which the source
        // calls out as the single-element case.
        expect(t.seen.getValue()).toBe('LMR');
    });

    it('honours stopPropagation — THE promise the barrel makes about this export', () => {
        const slots = exoEventSlotsFor('third-pack-stop', 'click');
        const root = host();
        const leaf = document.createElement('button');
        root.appendChild(leaf);
        const t = trail();
        carry(leaf, slots, note('L', true), t);
        carry(root, slots, note('R'), t);

        root.addEventListener('click', createExoDelegatedListener(root, slots));
        leaf.dispatchEvent(new Event('click', { bubbles: true }));

        // If this ever reads 'LR', a pack built on this export runs handlers its author stopped,
        // and the paragraph in `src/index.ts` promising these semantics is false.
        expect(t.seen.getValue()).toBe('L');
    });

    it('stops AT the root and does not climb past it', () => {
        // A root is a boundary, not a starting point: a handler above it belongs to somebody
        // else's render and must not be run by this one.
        const slots = exoEventSlotsFor('third-pack-bound', 'click');
        const outside = host();
        const root = document.createElement('div');
        const leaf = document.createElement('button');
        outside.appendChild(root);
        root.appendChild(leaf);
        const t = trail();
        carry(leaf, slots, note('L'), t);
        carry(outside, slots, note('OUTSIDE'), t);

        root.addEventListener('click', createExoDelegatedListener(root, slots));
        leaf.dispatchEvent(new Event('click', { bubbles: true }));

        expect(t.seen.getValue()).toBe('L');
    });
});
