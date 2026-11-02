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
import {
    EXO_DIRECT_EVENTS,
    EXO_DIRECT_PACK_ID,
    EXO_NON_BUBBLING_EVENTS,
    ExoDomBackend,
    attachExoDelegatedEvent,
    attachExoDirectEvent,
    createExoEventPortData,
    exoEventSlotsFor,
    installExoDelegatedRoot,
    withExoCompiler,
} from '../../index';
import type { TExoEventPortData, TExoEventsApi, TExoEventSlots } from '../../index';
import { host, createExoTestMachine } from '@exodra/test-utils';

/**
 * A THIRD PACK, WRITTEN THE WAY SOMEBODY OUTSIDE THIS REPO WOULD HAVE TO WRITE ONE — from the
 * package's public surface and nothing else.
 *
 * That is the whole point of the file: `TExoEventsApi` says a pack built elsewhere is composed
 * into a backend's `events` field exactly like the two built here — `withExoCompiler(new ExoDomBackend({ events:
 * () => PACK }))` — and this test is what makes that true rather than claimed. Every import above
 * comes from the barrel; if any of them stops being exported, this file stops compiling, which is
 * the failure it exists to produce.
 *
 * The pack below is deliberately a HYBRID, because that is the interesting shape a third pack
 * would have: it delegates the names it was given and hands every other event name to the
 * direct pack, so a page can delegate `click` and still put a closure on `submit`.
 *
 * It is also the one pack that BRANCHES in `attach`, and that is the price of being two strategies
 * at once: a shipped pack's `attach` is fixed, so the one call site in `on` sees one body.
 */

let packs = 0;

function hybridPack(delegated: readonly string[]): TExoEventsApi {
    // RULE 1 — the pack's own namespace. A counter, not a caller-supplied name: two packs
    // delegating `click` are still two packs and must not read each other's slots.
    const packId = 'hybrid' + ++packs;
    const slots: TExoEventSlots[] = [];
    const byName = new Map<string, TExoEventSlots>();
    for (const event of delegated) {
        // The refusal set is shared rather than re-listed, so a third pack cannot ship a
        // shorter one and accept `play` on a page whose controls then do nothing.
        if (EXO_NON_BUBBLING_EVENTS.has(event)) {
            throw new Error(`hybridPack: "${event}" does not bubble`);
        }
        const pair = exoEventSlotsFor(packId, event);
        slots.push(pair);
        byName.set(event, pair);
    }
    const rootKey = '__hybridRoot$' + packId;

    return {
        name: packId,
        port: (event: string): TExoEventPortData => {
            const pair = byName.get(event);
            // Every name this pack does not delegate keeps the strategy that can serve a
            // closure — minting the DIRECT pack's datum rather than a second copy of it.
            if (pair === undefined) return EXO_DIRECT_EVENTS.port(event);
            // One shared factory for both arms, which is what keeps the two data one shape.
            return createExoEventPortData(pair, null);
        },
        // `listener === null` is WHICH ARM MINTED THE DATUM, and each arm is the shipped body.
        attach: (node, data, handler, subject): void => {
            if (data.listener === null) attachExoDelegatedEvent(node, data, handler, subject);
            else attachExoDirectEvent(node, data, handler, subject);
        },
        // RULE 2 — the root's listeners are reference counted, by reusing the counted
        // implementation instead of repeating it.
        install: (root: Element): (() => void) => installExoDelegatedRoot(root, rootKey, slots),
    };
}

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

type TItem = { done: TCell<boolean>; count: TCell<number> };
const item = (): TItem => ({ done: cell(false), count: cell(0) });

type TNode = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    on(port: TExoPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
};

/** The same, for the one wire here that builds a LIST of rows rather than filling one. */
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

const rowWith = (make: (ports: TRowPorts) => TExoMachineInitialState<TNode>) =>
    createExoTestMachine(buildRow, make);

/**
 * `n` INSTANCES OF ONE ROW, AS A LIST — how an application makes several instances of a component,
 * so it is how the case below makes them. Row `at` is handed the number `at` as its params, and
 * the `<ul>` is the element the children port lives on: it sits INSIDE the pack's root, so the
 * walk from a button to that root is the same one it was.
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

/**
 * A BACKEND COMPOSED FROM A THIRD PACK — the whole of what "passed exactly like the built-in ones"
 * now means. One per case rather than one per file: each case builds its own pack, and a pack IS a
 * namespace (`packId`), so two cases sharing a backend would be sharing slots the pack numbered
 * apart on purpose.
 */
const backendOf = (pack: TExoEventsApi) =>
    composeExoPlugins(withExoCompiler(new ExoDomBackend()), { events: () => pack });

const SHIPPED_BACKEND = withExoCompiler(new ExoDomBackend());

const clickOn = (node: Element): void => {
    node.dispatchEvent(new Event('click', { bubbles: true }));
};

const TOGGLE_DONE: TExoEventHandler<Event, Element> = function (_event, subject) {
    const done = (subject as TItem).done;
    done.setValue(done.getValue() === true ? false : true);
};

const BUMP: TExoEventHandler<Event, Element> = function (_event, subject) {
    const count = (subject as TItem).count;
    count.setValue(count.getValue() + 1);
};

describe('a pack written outside this package', () => {
    it('renders and dispatches with no privileged access', () => {
        const BACKEND = backendOf(hybridPack(['click']));
        const items = [item(), item(), item()];
        const ROW = rowWith((P) => (c, at) => {
            c.text(P.label, 'row ' + at);
            c.on(P.click, TOGGLE_DONE, items[at as number]);
        });
        const parent = host();
        const dispose = BACKEND.render(listOf(ROW, 3), parent);

        clickOn(parent.querySelectorAll('button')[1]);
        expect(items[1].done.getValue()).toBe(true);
        expect(items[0].done.getValue()).toBe(false);

        // Nothing was attached per element, so the root's listeners ARE the behaviour.
        dispose();
        clickOn(parent.querySelectorAll('button')[0]);
        expect(items[0].done.getValue()).toBe(false);
    });

    it('does not double-dispatch against the built-in packs (rule 1)', () => {
        // A THIRD PACK'S ROOT WITH A DIRECTLY-SERVED SUBTREE INSIDE IT. The button carries its
        // own listener AND sits under a root dispatching the same event name, so a pack that
        // reused the direct strategy's slot names would have its walk find that handler and
        // run it a second time — a bump of two on a page that says one.
        const outer = host();
        const OUTER = rowWith((P) => (c) => {
            c.text(P.label, 'outer');
            c.on(P.click, TOGGLE_DONE, item());
        });
        backendOf(hybridPack(['click'])).render(OUTER, outer);

        const inner = document.createElement('div');
        outer.appendChild(inner);
        const counted = item();
        const INNER = rowWith((P) => (c) => {
            c.text(P.label, 'inner');
            c.on(P.click, BUMP, counted);
        });
        SHIPPED_BACKEND.render(INNER, inner);

        clickOn(inner.querySelectorAll('button')[0]);
        expect(counted.count.getValue()).toBe(1);
    });

    it('shares one root between two renders and outlives the first teardown (rule 2)', () => {
        // The failure this guards is not a crash either way: installing twice means every
        // handler runs twice, and releasing on the first teardown means a live render stops
        // responding. Both look like the handler's fault.
        // ONE BACKEND FOR BOTH RENDERS, because one PACK is what rule 2 is about: the backend's
        // `events` field holds the pack the factory returned, so two renders through this object
        // meet the same `rootKey` and the same reference count.
        const BACKEND = backendOf(hybridPack(['click']));
        const parent = host();
        const first = item();
        const second = item();
        const FIRST = rowWith((P) => (c) => {
            c.text(P.label, 'first');
            c.on(P.click, BUMP, first);
        });
        const SECOND = rowWith((P) => (c) => {
            c.text(P.label, 'second');
            c.on(P.click, BUMP, second);
        });

        const disposeFirst = BACKEND.render(FIRST, parent);
        const disposeSecond = BACKEND.render(SECOND, parent);

        const buttons = parent.querySelectorAll('button');
        clickOn(buttons[0]);
        // ONE listener, not two: the second install found the first's record and counted it.
        expect(first.count.getValue()).toBe(1);

        disposeFirst();
        clickOn(buttons[1]);
        // The second render is still live, so the root must still be listening.
        expect(second.count.getValue()).toBe(1);

        disposeSecond();
        clickOn(buttons[1]);
        expect(second.count.getValue()).toBe(1);
    });

    it('falls back to the direct pack for the names it does not delegate', () => {
        // A closure is the case only the direct strategy can serve, and calling that pack's own
        // `port` and `attach` is how a hybrid keeps it — the reason both halves are exported
        // rather than reimplemented behind a copy of `EXO_DIRECT_PACK_ID`.
        expect(EXO_DIRECT_PACK_ID).toBe('direct');

        const BACKEND = backendOf(hybridPack(['input']));
        let seen = 0;
        const ROW = rowWith((P) => (c) => {
            c.text(P.label, 'x');
            c.on(P.click, () => {
                seen++;
            });
        });
        const parent = host();
        BACKEND.render(ROW, parent);

        clickOn(parent.querySelectorAll('button')[0]);
        expect(seen).toBe(1);
    });
});
