// @vitest-environment jsdom
// `mounted` ON EVERY PATH AN INSTANCE ARRIVES BY — a root mount, a `c.one`, a row of a fixed
// `c.list`, a reconciled child, an adopted one, and a teardown. It is a FIELD, so every machine here
// is a DECORATED one; the engine under it never touches the lifecycle slot.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoMachine,
    TExoMachineNode,
    TExoNode,
    TExoPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { withExoComputedMachine } from '@exodra/computed';
import type { TExoComputedMachine, TExoComputedMachineNode } from '@exodra/computed';
import { describe, expect, it } from 'vitest';
import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler, withExoChildList } from '@exodra/dom';
import type { TExoDomMark, TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoChildList(withExoCompiler(new ExoDomBackend())));
const EXO_STR = new ExoStrBackend();

function buildCard(b: TExoSchemaCursor): { live: TExoPort } {
    let live!: TExoPort;
    b.el('li', null, (li) => {
        live = li.port('data-live');
    });
    return { live };
}

function buildHolder(b: TExoSchemaCursor): { slot: TExoChildrenPort } {
    let slot!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        slot = ul.childrenPort();
    });
    return { slot };
}

function makeCard(log: string[]): TExoComputedMachine<TExoComputedMachineNode> {
    const schema = createExoSchema(buildCard);
    return withExoComputedMachine(createExoMachine<TExoComputedMachineNode>(schema), (b) => {
        const mounted = b.mounted();
        b.derive(schema.ports.live, [mounted], (on) => (on ? 'yes' : 'no'));
        b.effectOn([mounted], (c) => {
            const on = mounted.get(c);
            log.push(`start ${on}`);
            return (): void => {
                log.push(`stop ${on}`);
            };
        });
    });
}

type TFixedOne = {
    one(port: TExoPort, component: TExoMachine<never>): void;
};
type TFixedList = {
    list(port: TExoPort, component: TExoMachine<never>, params: readonly unknown[]): void;
};
// A RECONCILED list is a composition, not a door: what the wire needs is the placement door and
// `build`, and the reconciler is handed both.
type TReactiveList = TExoMachineNode & {
    build(component: TExoMachine<never>, params?: unknown): TExoNode<TExoDomMark>;
    childList(port: TExoPort): TExoPlacedChildren<TExoNode<TExoDomMark>>;
};

const liveIn = (parent: HTMLElement): string =>
    Array.from(parent.querySelectorAll('li'))
        .map((el) => el.getAttribute('data-live'))
        .join(',');

const WIRED_THEN_PLACED = ['start false', 'stop false', 'start true'];

describe('mounted, on every path an instance arrives by', () => {
    it('a ROOT mount goes live', () => {
        const log: string[] = [];
        const CARD = makeCard(log);
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        expect(log).toEqual(WIRED_THEN_PLACED);
        expect(liveIn(parent)).toBe('yes');
    });

    it('a `c.one` child goes live — a path that made no record at all', () => {
        const log: string[] = [];
        const CARD = makeCard(log);
        const PARENT = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TFixedOne> =>
                (c) => {
                    c.one(P.slot, CARD);
                }
        );
        const parent = host();
        EXO_BACKEND.render(PARENT, parent);
        expect(log).toEqual(WIRED_THEN_PLACED);
        expect(liveIn(parent)).toBe('yes');
    });

    it('every row of a FIXED `c.list` goes live — the case this design pays for', () => {
        const log: string[] = [];
        const CARD = makeCard(log);
        const PARENT = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TFixedList> =>
                (c) => {
                    c.list(P.slot, CARD, Array.from({ length: 2 }));
                }
        );
        const parent = host();
        EXO_BACKEND.render(PARENT, parent);
        expect(log).toEqual([...WIRED_THEN_PLACED, ...WIRED_THEN_PLACED]);
        expect(liveIn(parent)).toBe('yes,yes');
    });

    it('a RECONCILED child goes live, through the hook the reconciler already calls', () => {
        const log: string[] = [];
        const CARD = makeCard(log);
        const src = source<readonly number[]>([1]);
        const holder = createExoSchema(buildHolder);
        const m = createExoMachine<
            TReactiveList,
            unknown,
            { rows: TExoPlacedChildren<TExoNode<TExoDomMark>>; shown: number[] }
        >(holder, {
            createInitialState: (c) => ({ rows: c.childList(holder.ports.slot), shown: [] }),
        });
        const PARENT = composeExoMachine(
            m,
            (m) =>
                withExoTransitions(m, {
                    showRows: (c) => {
                        const want = src.getValue();
                        c.state.shown = reconcileExoOrder(
                            c.state.rows,
                            c.state.shown,
                            want,
                            want,
                            () => c.build(CARD)
                        );
                    },
                }),
            (m) => {
                const { showRows } = m.transitions;
                return withExoEffects(m, (effect) => {
                    effect((c) => {
                        showRows(c);
                        return src.onChange(() => showRows(c));
                    });
                });
            }
        );
        const parent = host();
        EXO_BACKEND.render(PARENT, parent);
        expect(log).toEqual(WIRED_THEN_PLACED);
        expect(liveIn(parent)).toBe('yes');
        log.length = 0;
        src.setValue([1, 2]);
        expect(log).toEqual(WIRED_THEN_PLACED);
        expect(liveIn(parent)).toBe('yes,yes');
    });

    it('an ADOPTED instance is live, because it is in the document', () => {
        const log: string[] = [];
        const CARD = makeCard(log);
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        expect(liveIn(parent)).toBe('no');
        // THE SERVER RENDER TEARS ITS OWN EFFECT DOWN, and that second entry is the whole of what
        // a server teardown means: the markup is taken, then everything the wire `onTeardown`ed runs. It
        // read `['start false']` while the string backend collected disposers and ran none, so a
        // process that rendered pages kept one live subscription per render, for ever.
        expect(log).toEqual(['start false', 'stop false']);
        log.length = 0;
        EXO_BACKEND.hydrate(CARD, parent);
        expect(log).toEqual(WIRED_THEN_PLACED);
        expect(liveIn(parent)).toBe('yes');
    });

    it('goes false again when the instance is DESTROYED', () => {
        const log: string[] = [];
        const CARD = makeCard(log);
        const parent = host();
        const dispose = EXO_BACKEND.render(CARD, parent);
        log.length = 0;
        dispose();
        expect(log).toEqual(['stop true']);
    });

    it('is INSERTED ALREADY FILLED — the wire subscribes and fills on a detached element', () => {
        const schema = createExoSchema((b: TExoSchemaCursor) => {
            let live!: TExoPort;
            let label!: TExoPort;
            b.el('li', null, (li) => {
                live = li.port('data-live');
                label = li.port('data-label');
            });
            return { live, label };
        });
        const seen: string[] = [];
        const parent = host();
        const CARD = withExoComputedMachine(
            createExoMachine<TExoComputedMachineNode>(schema),
            (b) => {
                const mounted = b.mounted();
                const name = b.field('');
                b.derive(schema.ports.live, [mounted], (on) => (on ? 'yes' : 'no'));
                b.derive(schema.ports.label, [name], (value) => value);
                b.effectOn([mounted], (c) => {
                    if (!mounted.get(c)) return null;
                    const el = parent.querySelector('li');
                    seen.push(`${el?.isConnected} ${el?.getAttribute('data-label')}`);
                    return null;
                });
                const setName = b.transition<string, void>((c, value) => {
                    name.set(c, value);
                });
                return { setName };
            }
        );
        const { setName } = CARD.transitions;

        // `c.build` IS THE ONLY DOOR THAT LEAVES A LINE BETWEEN ARMING AND PLACEMENT, which is the
        // line this case needs: the machine is armed and standing on a detached element, the init
        // transition writes `data-label` there, and only then does `insert` put it in the document
        // and commit `mounted`. A root `render` places and commits inside one call and a caller
        // never gets between them.
        let place!: () => void;
        const HOLDER = createExoTestMachine(
            buildHolder,
            (P): TExoMachineInitialState<TExoDomNode> =>
                (c) => {
                    const rows = c.childList(P.slot);
                    const card = c.build(CARD);
                    setName(card as unknown as TExoComputedMachineNode, 'Alderaan');
                    place = (): void => {
                        rows.insert(card);
                    };
                }
        );
        EXO_BACKEND.render(HOLDER, parent);
        place();
        expect(seen).toEqual(['true Alderaan']);
    });

    it('a component that declares no mounted() never fills the exonode`s live slot', () => {
        const plain = createExoSchema(buildCard);
        const PLAIN = withExoComputedMachine(
            createExoMachine<TExoComputedMachineNode>(plain),
            (b) => {
                const tick = b.field(0);
                b.derive(plain.ports.live, [tick], (value) => `${value}`);
            }
        );
        const parent = host();
        EXO_BACKEND.render(PLAIN, parent);
        expect(liveIn(parent)).toBe('0');
    });
});
