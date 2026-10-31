// AXIS 7 — VIRTUAL LIST: a window of WINDOW rows over ITEMS items, scrolled all the
// way forward and all the way back. Only the window is ever in the document, so this
// is not about layout cost — it is about what happens when a row RE-ENTERS.
//
// The two models differ exactly there:
//   schema  its reconciler drops a row that leaves the window — node removed, disposers run,
//           the item struck off its order mirror — so a row coming back is a fresh clone.
//   Solid   <For> disposes a row's owner and effects when it leaves; coming back
//           means building it again.
//
// Fair by construction: every framework gets the same window, the same item data and
// the same declarative "here is the visible slice" update. A one-way scroll is
// included as the control — there NOTHING can be reused by anyone, so if the numbers
// separate only on the round trip, the difference really is re-entry.
//   schema  the Exodra core in `@exodra/core` + `@exodra/dom`. Its reconciler
//           (`reconcileExoOrder`) mirrors the order it has shown as an array of ITEMS and
//           recognises a survivor with `===` — the `Item` objects below are the same ones every
//           frame, so a row that is still on screen needs no key — but a row that LEAVES goes
//           through `TExoChildList.remove`, which unmounts it, runs its disposers and takes it out
//           of the mirror. There is no cache behind it. So a row scrolling back into view is a
//           fresh clone and a fresh wiring, exactly like Solid's <For>. The round trip vs the
//           one-way control is what puts a number on that difference instead of a paragraph.
import { createSignal, For } from 'solid-js';
import { createElement as rc, useState } from 'react';
import { abBench, type Scenario } from '../../../harness';
import { markupOf } from '../../gates/markup-gate';
// Package specifiers — the schema core is measured out of its `dist`, never out of src.
import { type TExoChildrenPort, type TExoEventPort, type TExoTextPort } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import {
    ExoDomBackend,
    type TExoDomMachine,
    type TExoDomNode,
    withExoChildList,
    withExoCompiler,
} from '@exodra/dom';
import { createExoSchema } from '@exodra/core';
import { createExoMachineBuilder } from '@exodra/core';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

const ITEMS = 1000;
const WINDOW = 10;
const STEP = 10;

type Item = { id: number; text: string };
const DATA: Item[] = Array.from({ length: ITEMS }, (_, i) => ({ id: i, text: `row ${i}` }));

// --- the schema core's rows: module scope, one declaration each, one compiled schema each ---
// THE ITEM IS THE ROW'S DATA and the row's identity at once, which is the whole reason this
// core needs no key: `DATA[i]` is one permanent object, so "the same row" is a `===`.
//
// A wire is handed its POSITION and nothing else, so the item a row stands for is written into one
// of these two arrays by the reconciler's build callback an instant before `c.build` runs the wire.
// Two arrays because the two rows take different item types; one `unknown[]` would need a cast.
const BUILDING_PLAIN: Item[] = [];
const BUILDING_RICH: TRichItem[] = [];

const ROW_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        text = li.textPort();
    });
    return { text };
});
const mROW = createExoMachineBuilder<TExoDomNode>(ROW_SCHEMA);
mROW.createInitialState((c, i) => {
    c.text(ROW_SCHEMA.ports.text, BUILDING_PLAIN[i].text);
});
const ROW = mROW.done();

/** The rich row's item: the same row, plus the source its text is bound to. */
type TRichItem = { id: number; sig: TExoBenchSource<string> };

// The rich row — one reactive text and one handler, the shape a real virtual-list row has.
// The handler is allocated PER ROW rather than shared, because that is what every other
// participant here does (`onClick={() => {}}` inside the row factory); a module-level `noop`
// would quietly make this participant's rebuild cheaper than everyone else's.
const RICH_ROW_SCHEMA = createExoSchema((b) => {
    let click!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        click = li.eventPort('click');
        text = li.textPort();
    });
    return { click, text };
});
const mRICH_ROW = createExoMachineBuilder<TExoDomNode>(RICH_ROW_SCHEMA);
const K_RICH_ROW = mRICH_ROW.createInitialState((c, i) => {
    c.on(RICH_ROW_SCHEMA.ports.click, () => {});
    return BUILDING_RICH[i].sig;
});
const showRichText = mRICH_ROW.transition((c: TExoDomNode) => {
    c.text(RICH_ROW_SCHEMA.ports.text, c.readState(K_RICH_ROW).getValue());
});
mRICH_ROW.effect((c) => {
    showRichText(c);
    return c.readState(K_RICH_ROW).onChange(() => showRichText(c));
});
const RICH_ROW = mRICH_ROW.done();

/**
 * The `<ul>` whose single children port holds the window.
 *
 * Built per scenario because its wiring names THAT scenario's source — setup, outside the
 * timed region. The ROW components, which are what a frame clones, stay module-level.
 */
function mountExodraWindow<TItem>(
    c: HTMLElement,
    component: TExoDomMachine,
    visible: TExoBenchSource<readonly TItem[]>,
    building: TItem[]
): () => void {
    const UL_SCHEMA = createExoSchema((b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    });
    const mUL = createExoMachineBuilder<TExoDomNode>(UL_SCHEMA);
    const K_UL = mUL.createInitialState((cc) => ({
        kids: cc.childList(UL_SCHEMA.ports.rows),
        shown: [] as TItem[],
    }));
    const showWindow = mUL.transition((cc: TExoDomNode) => {
        const state = cc.readState(K_UL);
        const want = visible.getValue();
        state.shown = reconcileExoOrder(state.kids, state.shown, want, want, (item, i) => {
            building[i] = item;
            return cc.build(component, i);
        });
    });
    mUL.effect((cc) => {
        showWindow(cc);
        return visible.onChange(() => showWindow(cc));
    });
    const UL = mUL.done();
    return EXO_BACKEND.render(UL, c);
}

// Window starts: 0,10,…,990 then back down to 0. Each is one "frame".
const FRAMES: number[] = [];
for (let s = 0; s + WINDOW <= ITEMS; s += STEP) FRAMES.push(s);
for (let s = ITEMS - WINDOW; s >= 0; s -= STEP) FRAMES.push(s);
// Control: forward only — no row is ever revisited.
const ONE_WAY: number[] = FRAMES.slice(0, FRAMES.length / 2);

export async function benchmarkVirtualList(rounds = 50, batch = 1): Promise<void> {
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');

    const el = (): HTMLElement => {
        const c = document.createElement('div');
        document.body.appendChild(c);
        return c;
    };

    // A RICH row: one reactive text plus one handler, which is what a real virtual
    // list row looks like. It matters because a cached row comes back with its
    // `disposers` already run — the DOM node is reused but the bindings have to be
    // set up and re-subscribed again. So a richer row raises BOTH what re-attaching
    // saves (construction) and what it costs back (binding setup).
    const runRich = (frames: number[]) => {
        const solidPrep = (): Scenario => {
            const c = el();
            const [slice, setSlice] = createSignal(DATA.slice(0, WINDOW));
            const App = () => (
                <ul>
                    <For each={slice()}>
                        {(d: Item) => {
                            const [t] = createSignal(d.text);
                            return (
                                <li class="row" onClick={() => {}}>
                                    {t()}
                                </li>
                            );
                        }}
                    </For>
                </ul>
            );
            const dispose = render(() => App() as never, c);
            return {
                measure: () => {
                    for (let f = 0; f < frames.length; f++) {
                        const s = frames[f];
                        setSlice(DATA.slice(s, s + WINDOW));
                    }
                },
                cleanup: () => {
                    dispose();
                    c.remove();
                },
            };
        };

        const reactPrep = (): Scenario => {
            const c = el();
            let setSlice: (v: Item[]) => void = () => {};
            const App = (): unknown => {
                const [slice, set] = useState(DATA.slice(0, WINDOW));
                setSlice = set;
                return rc(
                    'ul',
                    null,
                    slice.map((d) =>
                        rc('li', { key: d.id, className: 'row', onClick: () => {} }, d.text)
                    )
                );
            };
            const root = createRoot(c);
            flushSync(() => root.render(rc(App as never)));
            return {
                measure: () => {
                    for (let f = 0; f < frames.length; f++) {
                        const s = frames[f];
                        flushSync(() => setSlice(DATA.slice(s, s + WINDOW)));
                    }
                },
                cleanup: () => {
                    root.unmount();
                    c.remove();
                },
            };
        };

        // --- Schema core: the same rich row, reconciled by item identity -----------
        // The items are built per scenario because each carries its own source, but they are
        // built ONCE per scenario and never again — so identity is stable across frames and a
        // row still on screen is recognised without a key, exactly like the plain variant.
        const exodraPrep = (): Scenario => {
            const items: TRichItem[] = DATA.map((d) => ({
                id: d.id,
                sig: createExoBenchSource(d.text),
            }));
            const c = el();
            const visible = createExoBenchSource<readonly TRichItem[]>(items.slice(0, WINDOW));
            const dispose = mountExodraWindow(c, RICH_ROW, visible, BUILDING_RICH);
            return {
                measure: () => {
                    for (let f = 0; f < frames.length; f++) {
                        const s = frames[f];
                        visible.setValue(items.slice(s, s + WINDOW));
                    }
                },
                cleanup: () => {
                    dispose();
                    c.remove();
                },
            };
        };

        return { exodra: exodraPrep, solid: solidPrep, react: reactPrep };
    };

    const run = (frames: number[]) => {
        const solidPrep = (): Scenario => {
            const c = el();
            const [slice, setSlice] = createSignal(DATA.slice(0, WINDOW));
            const App = () => (
                <ul>
                    <For each={slice()}>{(d: Item) => <li class="row">{d.text}</li>}</For>
                </ul>
            );
            const dispose = render(() => App() as never, c);
            return {
                measure: () => {
                    for (let f = 0; f < frames.length; f++) {
                        const s = frames[f];
                        setSlice(DATA.slice(s, s + WINDOW));
                    }
                },
                cleanup: () => {
                    dispose();
                    c.remove();
                },
            };
        };

        const reactPrep = (): Scenario => {
            const c = el();
            let setSlice: (v: Item[]) => void = () => {};
            const App = (): unknown => {
                const [slice, set] = useState(DATA.slice(0, WINDOW));
                setSlice = set;
                return rc(
                    'ul',
                    null,
                    slice.map((d) => rc('li', { key: d.id, className: 'row' }, d.text))
                );
            };
            const root = createRoot(c);
            flushSync(() => root.render(rc(App as never)));
            return {
                measure: () => {
                    for (let f = 0; f < frames.length; f++) {
                        const s = frames[f];
                        flushSync(() => setSlice(DATA.slice(s, s + WINDOW)));
                    }
                },
                cleanup: () => {
                    root.unmount();
                    c.remove();
                },
            };
        };

        // --- Schema core: DATA itself is the identity, so nothing needs a key ------
        const exodraPrep = (): Scenario => {
            const c = el();
            const visible = createExoBenchSource<readonly Item[]>(DATA.slice(0, WINDOW));
            const dispose = mountExodraWindow(c, ROW, visible, BUILDING_PLAIN);
            return {
                measure: () => {
                    for (let f = 0; f < frames.length; f++) {
                        const s = frames[f];
                        visible.setValue(DATA.slice(s, s + WINDOW));
                    }
                },
                cleanup: () => {
                    dispose();
                    c.remove();
                },
            };
        };

        return { exodra: exodraPrep, solid: solidPrep, react: reactPrep };
    };

    // GATE — the window itself. A window that reconciled to the wrong slice, or to the right
    // rows in the WRONG ORDER, would still time beautifully. `exodra` is this axis's own
    // renderer, so there is no second renderer to diff it against; instead the markup it
    // produces is checked against the exact bytes the visible slice defines, as mounted, after
    // a forward frame, and after a BACKWARD one — the backward frame is where an anchor bug
    // puts the rows on the wrong side of nothing.
    {
        const schC = el();
        const visible = createExoBenchSource<readonly Item[]>(DATA.slice(0, WINDOW));
        const dispose = mountExodraWindow(schC, ROW, visible, BUILDING_PLAIN);

        // The bytes a window starting at `s` MUST serialise to. Written out here rather than
        // taken from another renderer, so this gate depends on nothing that can drift.
        const wantWindow = (s: number): string =>
            `<ul>${DATA.slice(s, s + WINDOW)
                .map((d) => `<li class="row">${d.text}</li>`)
                .join('')}</ul>`;
        const check = (s: number, stage: string): void => {
            const got = markupOf(schC);
            const want = wantWindow(s);
            if (got !== want) {
                // eslint-disable-next-line no-console
                console.log(
                    `❌ gate virtual-list/schema @ ${stage}\n  want: ${want}\n  got : ${got}`
                );
                throw new Error(
                    `virtual-list: the schema window is not the visible slice @ ${stage} — ` +
                        'the timings below would be measuring a different program'
                );
            }
            // eslint-disable-next-line no-console
            console.log(`✅ gate virtual-list/schema @ ${stage}: the window IS the visible slice`);
        };
        const frame = (s: number, stage: string): void => {
            visible.setValue(DATA.slice(s, s + WINDOW));
            check(s, stage);
        };
        check(0, 'window 0 (as mounted)');
        frame(10, 'window 10 (forward, no overlap)');
        frame(15, 'window 15 (forward, half overlapping — rows must MOVE, not rebuild)');
        frame(10, 'window 10 again (backward — re-entry)');

        // THE RE-ENTRY PROBE, which is what this axis exists to expose. It is reported, not
        // enforced: a rebuilt row and a re-attached row produce identical markup, so no diff
        // can tell them apart, and the difference is the entire story of the round-trip number
        // below. If this ever prints REUSED for `exodra`, something started caching and both
        // this file's header and the way the numbers are read have to change.
        const schBefore = schC.querySelector('li');
        visible.setValue(DATA.slice(500, 500 + WINDOW));
        visible.setValue(DATA.slice(10, 10 + WINDOW));
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate virtual-list re-entry: a row that left and came back is ` +
                `schema=${
                    schC.querySelector('li') === schBefore
                        ? 'REUSED (re-attached)'
                        : 'REBUILT (no cache — as documented)'
                }`
        );

        dispose();
        schC.remove();
    }

    // GATE — the RICH row, which is a different program from the plain one on this side: its
    // text is written by a transition an effect re-runs on every change of the row's source, and it
    // carries a listener. A subscription that wrote nowhere would leave the text
    // placeholder — one space — where the row's text belongs, which is exactly the kind of
    // difference that is invisible in a screenshot and obvious in a diff.
    {
        const items: TRichItem[] = DATA.map((d) => ({
            id: d.id,
            sig: createExoBenchSource(d.text),
        }));
        const schC = el();
        const visible = createExoBenchSource<readonly TRichItem[]>(items.slice(0, WINDOW));
        const dispose = mountExodraWindow(schC, RICH_ROW, visible, BUILDING_RICH);

        const check = (want: string, stage: string): void => {
            const got = markupOf(schC);
            if (got !== want) {
                // eslint-disable-next-line no-console
                console.log(
                    `❌ gate virtual-list rich/schema @ ${stage}\n  want: ${want}\n  got : ${got}`
                );
                throw new Error(
                    `virtual-list rich: the bound row is not rendering its source @ ${stage} — ` +
                        'the timings below would be measuring a binding that writes nowhere'
                );
            }
            // eslint-disable-next-line no-console
            console.log(
                `✅ gate virtual-list rich/schema @ ${stage}: every bound row renders its source`
            );
        };
        const wantFrom = (texts: readonly string[]): string =>
            `<ul>${texts.map((t) => `<li class="row">${t}</li>`).join('')}</ul>`;

        check(wantFrom(DATA.slice(0, WINDOW).map((d) => d.text)), 'window 0 (as mounted)');
        visible.setValue(items.slice(15, 15 + WINDOW));
        check(
            wantFrom(DATA.slice(15, 15 + WINDOW).map((d) => d.text)),
            'window 15 (half overlapping)'
        );
        // And that a row's binding is LIVE after the frame that moved it — a re-entering row
        // that came back unsubscribed would render its old text forever.
        items[15].sig.setValue('probe');
        check(
            wantFrom(['probe', ...DATA.slice(16, 15 + WINDOW).map((d) => d.text)]),
            "after writing through a moved row's source"
        );
        items[15].sig.setValue(DATA[15].text);

        dispose();
        schC.remove();
    }

    await abBench(
        `VIRTUAL LIST — window ${WINDOW} over ${ITEMS}, scrolled forward AND back`,
        `ms/${FRAMES.length} frames`,
        run(FRAMES),
        { rounds, batch }
    );

    await abBench(
        `VIRTUAL LIST (control) — forward only, nothing is ever revisited`,
        `ms/${ONE_WAY.length} frames`,
        run(ONE_WAY),
        { rounds, batch }
    );

    await abBench(
        `VIRTUAL LIST rich — reactive text + handler per row, forward AND back`,
        `ms/${FRAMES.length} frames`,
        runRich(FRAMES),
        { rounds, batch }
    );

    await abBench(
        `VIRTUAL LIST rich (control) — forward only`,
        `ms/${ONE_WAY.length} frames`,
        runRich(ONE_WAY),
        { rounds, batch }
    );
}
