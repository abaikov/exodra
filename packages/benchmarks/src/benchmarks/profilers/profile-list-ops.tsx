// WHERE A LIST FIRED BY IN-PLACE OPS SPENDS ITS TIME — the schema core's list profiled rather than
// timed. Fired by `scripts/profile-list-ops.mjs`; not a published axis.
//
// THE "OP PATH" THIS FILE WAS WRITTEN TO ATTRIBUTE NO LONGER EXISTS, and that is the first thing to
// know before reading a profile out of it. There is no door that APPLIES an operation to the child
// list without a re-read. A list is a transition calling `reconcileExoOrder` over
// `c.childList(port)`, which an effect fires on any notification as a bare "it moved": it re-reads
// `getValue()` and diffs. So the four calls below are
// still the four calls an application makes, and what they reach is a DIFF: this file now
// attributes the reconcile, and nothing here is evidence about a told-what-changed path.
//
// HISTORICAL NUMBER, kept for provenance and NOT reproducible here: when this repo still shipped
// the older three-props renderer, `list-update` measured the schema core's op path at ~2.9× that
// renderer's for the same 80 operations (0.200 ms vs 0.070 ms per 80 ops, batch 10) — about
// 1.6 µs per operation. Both that renderer AND the op path have since been deleted, so the
// comparison cannot be re-run under any reading.
//
// The same 300 rows and the same {move, insert, remove, append} sequence, run N times under a
// V8 CPU profile. Nothing is instrumented and no hot path is touched; the profiler samples.
import { type TExoChildrenPort, type TExoTextPort } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { ExoDomBackend, type TExoDomNode, withExoChildList, withExoCompiler } from '@exodra/dom';
import { createExoSchema } from '@exodra/core';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
} from '@exodra/core';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

const ROWS = 300;
// 200 rounds per mount, not the axis's 20: a profile has to be dominated by the thing it is
// attributing, and mounting 300 rows costs far more than 80 operations. The list drifts from
// 300 to 500 rows over one mount (each round is +2 −1) and BOTH engines drift identically, so
// the comparison holds; what this file must not be read as is a per-op timing, only a
// per-function attribution.
const OP_ROUNDS = 200;
type Row = { id: number; text: string };

const LI_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', null, (li) => {
        text = li.textPort();
    });
    return { text };
});
const mLI = createExoMachine(LI_SCHEMA, {
    createInitialState: (c: TExoDomNode, item: Row) => {
        c.text(LI_SCHEMA.ports.text, item.text);
    },
});
const LI = mLI;

const el = (): HTMLElement => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    return c;
};
const seed = (): Row[] => Array.from({ length: ROWS }, (_, i) => ({ id: i, text: `row ${i}` }));

let uid = 0;

/** The schema core: the reconciler over an array mutated in place, which re-reads and diffs on every op. */
export async function profileListOpsExodra(times = 20): Promise<void> {
    for (let t = 0; t < times; t++) {
        const c = el();
        const items = seed();
        let notify: (() => void) | null = null;
        const rows = {
            getValue: (): readonly Row[] => items,
            onChange: (listener: () => void): (() => void) => {
                notify = listener;
                return () => {
                    notify = null;
                };
            },
        };
        const changed = (): void => {
            if (notify !== null) notify();
        };
        const UL_SCHEMA = createExoSchema((b) => {
            let rowsPort!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rowsPort = ul.childrenPort();
            });
            return { rows: rowsPort };
        });
        const mUL = createExoMachine(UL_SCHEMA, {
            createInitialState: (conn: TExoDomNode) => ({
                kids: conn.childList(UL_SCHEMA.ports.rows),
                shown: [] as Row[],
            }),
        });
        const UL = composeExoMachine(
            mUL,
            (m) =>
                withExoTransitions(m, {
                    showRows: (conn) => {
                        const state = conn.state;
                        const want = rows.getValue();
                        state.shown = reconcileExoOrder(
                            state.kids,
                            state.shown,
                            want,
                            want,
                            (item) => conn.build(LI, item)
                        );
                    },
                }),
            (m) =>
                withExoEffects(m, (effect) => {
                    effect((conn) => {
                        showRows(conn);
                        return rows.onChange(() => showRows(conn));
                    });
                })
        );
        const { showRows } = UL.transitions;
        const dispose = EXO_BACKEND.render(UL, c);
        for (let r = 0; r < OP_ROUNDS; r++) {
            items.splice(150, 0, items.splice(0, 1)[0]);
            changed();
            items.splice(75, 0, { id: 1e6 + uid, text: `ins ${uid++}` });
            changed();
            items.splice(200, 1);
            changed();
            items.push({ id: 1e6 + uid, text: `add ${uid++}` });
            changed();
        }
        dispose();
        c.remove();
    }
}
