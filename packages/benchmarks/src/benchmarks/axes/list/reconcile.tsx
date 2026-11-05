// DIAGNOSTIC — DECLARATIVE LIST RECONCILE: isolates the schema core's reconcile path
// (`reconcileExoOrder` composed over `c.portChildList(port)` and `wireExoNode(c.createExoNode(M))`) against Solid <For> /
// Svelte {#each} / React keyed map / voby / Marko / Lit `repeat()` / Mikado. A list of N keyed rows
// is REPLACED with a shuffled array M times — no imperative move/insert; every framework gets "here
// is the new order, reconcile it". Rows are IDENTITY-STABLE per id (the schema core reconciles by
// row-object identity, the others by key) so reuse is possible for all — this measures the reconcile
// itself, not a rebuild.
//
// `exodra` — the core in `@exodra/core` + `@exodra/dom` — is the subject here, and this is the
// axis that reaches the part of its reconciler nothing else in the suite reaches. `list-update`
// splices contiguously, so most of its work is absorbed by the head and tail trims that walk the
// agreeing ends. A SHUFFLE defeats those trims: every row survives, none is added or removed, and
// the order is scrambled — so almost every position falls into the scrambled-middle pass and its
// moves. That is the code path a real drag-reorder, sort or
// filter-flip hits, and it had never been timed.
//
// IT IS THE LIS STRATEGY. `reconcileExoOrder` trims the agreeing head and tail, then for the
// scrambled middle keeps the longest increasing subsequence of survivors in place
// (`getExoSequence`) and moves the rest — the same family Solid, Marko and stage0 run, reached
// through the schema core's row objects compared with `===` instead of a key→row Map.
//
// `marko` is here for the first time too, and it is the participant this axis was most obviously
// missing: Marko 6's list reconciler is a MINIMUM-MOVE one (`loop()` in
// marko/dist/dom.mjs — key→scope Map, then move the minimum by longest increasing subsequence),
// so a shuffle is the one measurement that puts the two general cases side by side. It is fired
// the only way a mounted Marko template can be advanced from outside — `update({ rows })` — and it
// is keyed by the row id (`by=(id => id)` in `marko/MkReconcile.marko`), because `<for of=…>`
// otherwise keys by INDEX and an index-keyed shuffle is not a shuffle at all: nothing moves and
// 200 texts change instead. That would be a much cheaper program wearing this axis's name.
//
// `mikado` is here for the first time as well, and of the three newcomers it is the one this axis
// most needed. Mikado 0.8.400 beats every participant in this suite on the two APP axes, and it
// appeared on no list axis at all — a benchmark that omits the fastest rival from the measurements
// where it claims its widest margins is not worth reading. Its reconciler is a THIRD algorithm,
// not a second copy of the others: where Solid and Marko build a key→row map and then move the
// minimum by keeping the longest increasing subsequence in place, Mikado
// runs Thomas Wilkerling's "longest distance" strategy in ONE forward pass with no look-ahead pass
// at all — at each cursor position it scans forward for the nearest matching key in each direction
// and shifts whichever side is closer, keeping its `dom` array in step as it goes (`reconcile()`,
// mikado/src/mikado.js:1243). A 200-row shuffle is precisely the input those strategies
// disagree about, so this is the measurement, not a formality.
//
// IT IS ADVANCED THE WAY MIKADO'S OWN DOCS ADVANCE A KEYED LIST — `view.render(newArray)` — and it is
// keyed by `key="data.id"`, without which `render()` does not diff at all: an unkeyed,
// non-recycling view takes `if(length && !key && !this.recycle){ this.remove(0, length) }`
// (mikado.js:757) and rebuilds all 200 rows. Everything else about the setting is argued beside
// the template below.
//
// `lit` is the last of the newcomers, and it is here because it was on three axes and absent from
// the four where this suite's margins are widest — which reads as selection whether or not it was
// meant as one. It brings a FOURTH reconcile strategy: `repeat()` is a TWO-ENDED diff (its own
// comment in `lit-html/directives/repeat.js` credits ivi, Vue and snabbdom) — head and tail
// pointers matching in place while either end agrees, then lazily-built key→index Maps for the
// scrambled middle. A two-ended diff computes no minimum move set, so on a scramble it can move
// more nodes than the LIS strategies do, and that is a difference worth pricing rather than
// hiding. It is keyed by the row id via `repeat()`'s key function, because Lit's default list —
// a plain `.map()` — renders POSITIONALLY: handed a shuffle it moves nothing and rewrites 200
// texts, and it would pass both the markup diff and the survivor count while doing so. The gate
// below therefore asserts the keying by name. The rest of the argument, including why standalone
// `render()` rather than `LitElement` and why no flush, is in `participants/lit/reconcile.tsx`.
import { createSignal, For } from 'solid-js';
import { createElement as rc, useState } from 'react';
// Module scope, because `Mikado.compile()` is the runtime compiler and the template below must be
// compiled ONCE for the life of the process — never inside a measured region, the same deal
// Solid's compiler and the schema core's port numbering get.
import Mikado from 'mikado';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { mount as svMount, unmount as svUnmount, flushSync as svelteFlush } from 'svelte';
import { abBench, type Scenario } from '../../../harness';
import { gateMarkup } from '../../gates/markup-gate';
// Package specifiers — the schema core is measured out of its `dist`, never out of src.
import { type TExoChildrenPort, type TExoTextPort } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { createExoBenchSource } from '../../shared/createExoBenchSource';
import type { TExoBenchSource } from '../../shared/types/TExoBenchSource';
import { ExoDomBackend, type TExoDomNode, withExoCompiler } from '@exodra/dom';
import { createExoSchema } from '@exodra/core';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
} from '@exodra/core';
import { wireExoNode } from '@exodra/core';
import type { TExoDomPortChildList } from '@exodra/dom';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

const N = 200;
const OPS = 30; // shuffle-and-replace this many times per measured batch

// Deterministic shuffles (no Math.random — that's banned in this env anyway; and a
// fixed sequence keeps runs comparable). Each op rotates + swaps a few pairs.
function shuffled(order: number[], seed: number): number[] {
    const a = order.slice();
    const rot = seed % a.length;
    const b = a.slice(rot).concat(a.slice(0, rot)); // rotate
    for (let k = 0; k < a.length; k += 7) {
        const j = (k + seed) % a.length;
        const t = b[k];
        b[k] = b[j];
        b[j] = t; // scatter swaps
    }
    return b;
}
const IDS = Array.from({ length: N }, (_, i) => i);

// --- the schema core's row, and the 200 permanent objects it reconciles by -------------------
// ONE object per id, for the life of the process. The other participants hand their list block
// a key (`<For>` by value, React by `key`, Svelte by `{#each … (id)}`); this core is handed the
// objects themselves and recognises a survivor with `===`, which is why nothing below extracts
// a key from anything. The text never changes — only the POSITION does — so the wiring is
// `set`, not `bind`: a per-row subscription that could never fire is work no other participant
// on this axis does either.
type TShuffleRow = { readonly id: number };
const SHUFFLE_ROWS: readonly TShuffleRow[] = IDS.map((id) => ({ id }));

const SHUFFLE_ROW_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        text = li.textPort();
    });
    return { text };
});
const mSHUFFLE_ROW = createExoMachine(SHUFFLE_ROW_SCHEMA, {
    createInitialState: (c: TExoDomNode, row: TShuffleRow) => {
        c.text(SHUFFLE_ROW_SCHEMA.ports.text, `#${row.id}`);
    },
});
const SHUFFLE_ROW = mSHUFFLE_ROW;

// --- MIKADO'S ROW ----------------------------------------------------------------------------
/**
 * `<li class="row">#0</li>`, exactly the reference's bytes, plus a key the DOM never sees.
 *
 * `key="data.id"` is consumed by the compiler — `case "key": template.key = strip(v).replace(
 * "data.", "")` in `compile.js`, which sets the view's key and never pushes the attribute into
 * `tpl.attr` — so it cannot appear in a markup diff. The key it names is the SAME row identity
 * every other participant on this axis uses: React's `key={id}`, Svelte's `{#each rows as id (id)}`,
 * Solid's and voby's `<For>` over the ids themselves, Marko's `by=(id => id)`, and the schema
 * core's 200 permanent `TShuffleRow` objects compared with `===`. Which is why Mikado is handed
 * those very objects: its keyed mode reads the key off the item (`item[key]`), so the item has to
 * be an object with an `id`, and `SHUFFLE_ROWS` already is exactly that. Nothing is allocated per
 * shuffle that the schema core does not also allocate.
 */
const MK_ROW: ReturnType<typeof Mikado.compile> = Mikado.compile(
    '<li class="row" key="data.id">#{{ data.id }}</li>'
);

/**
 * The `<ul>` whose single children port holds the shuffled rows.
 *
 * Built per scenario because its wiring names THAT scenario's source; that build is setup and
 * the timed region is the shuffles. `SHUFFLE_ROW`, which is what a reconcile clones when it has
 * to build at all, stays module-level with one compiled schema.
 */
function mountExodraRows(
    c: HTMLElement,
    rows: TExoBenchSource<readonly TShuffleRow[]>
): () => void {
    const UL_SCHEMA = createExoSchema((b) => {
        let port!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            port = ul.childrenPort();
        });
        return { rows: port };
    });
    const mUL = createExoMachine(UL_SCHEMA, {
        createInitialState: (cc: TExoDomNode) => ({
            kids: (cc as TExoDomNode & TExoDomPortChildList).portChildList(UL_SCHEMA.ports.rows),
            shown: [] as TShuffleRow[],
        }),
    });
    const UL = composeExoMachine(
        mUL,
        (m) =>
            withExoTransitions(m, {
                showRows: (cc) => {
                    const state = cc.state;
                    const want = rows.getValue();
                    state.shown = reconcileExoOrder(state.kids, state.shown, want, want, (item) =>
                        wireExoNode(cc.createExoNode(SHUFFLE_ROW), item)
                    );
                },
            }),
        (m) => {
            const { showRows } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((cc) => {
                    showRows(cc);
                    return rows.onChange(() => showRows(cc));
                });
            });
        }
    );
    return EXO_BACKEND.render(UL, c);
}

export async function benchmarkReconcile(rounds = 100, batch = 3): Promise<void> {
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const SvReconcile = (await import('../../svelte/SvReconcile.svelte')).default;
    // Voby: keyed reconcile via <For> (keys by row-id value → reuse+move), same as
    // Solid; oby.tick() flushes synchronously so each shuffle commits in-region.
    const {
        $,
        $$,
        h: vh,
        render: vRender,
        For: vFor,
    } = (await import('voby')) as unknown as {
        $: (v: unknown) => { (): unknown; (v: unknown): void };
        $$: (v: unknown) => unknown;
        h: (...a: unknown[]) => unknown;
        render: (child: unknown, parent: Element) => () => void;
        For: unknown;
    };
    const { tick: obyTick } = (await import('oby')) as unknown as { tick: () => void };
    // Marko 6, authored as a `.marko` component and compiled by the inline compiler in
    // `vite.config.ts` — the same wiring `todo-app.tsx` uses for the app axes.
    const MkReconcile = (await import('../../marko/MkReconcile.marko')).default as unknown as {
        mount(
            input: { rows: readonly number[] },
            el: HTMLElement
        ): { update(input: { rows: readonly number[] }): void; destroy(): void };
    };
    // Marko batches on its own queue; `run()` drains it synchronously. See the note at the
    // Marko scenario below for why it is called even though `update()` already drains.
    const { markoFlush } = await import('../../marko/flush');
    // Lit 3, through `lit-html`'s standalone `render()`. It has no counterpart to the flushes
    // above and needs none: `render()` commits inside the call, with no queue and no microtask
    // in the path. Its list is `repeat()` with the row id as the key — the default, `map()`,
    // would rewrite 200 texts and move nothing, which passes both halves of the gate below while
    // being a much cheaper program. That, and `repeat()`'s algorithm, is in
    // `participants/lit/reconcile.tsx`.
    const { mountLitReconcile } = await import('../../participants/lit/reconcile');
    // The three closest architectural relatives, and between them they bring TWO more reconcile
    // strategies to an axis whose whole point is that the field disagrees about this one problem:
    //
    //   stage0  — the same ivi/Surplus algorithm Solid and Marko run (Map from item to new index,
    //             then a longest-increasing-subsequence move set), with NO renderer around it and
    //             no state of its own between ops. It is the CEILING for THAT strategy, and the
    //             schema core runs the same strategy, so `exodra` read against `stage0` is one
    //             algorithm plus the core's overhead.
    //             See `participants/stage0/reconcile.tsx`.
    //   sinuous — `sinuous/map`, whose header credits stage0's `reconcile` as its ancestor: same
    //             family again, but reached through a subscription and with one quirk that costs
    //             it a rebuilt row per shuffle. See `participants/sinuous/reconcile.tsx`.
    //   uhtml   — a FIFTH strategy: `udomdiff`, a two-ended scan with head/tail/reverse fast
    //             paths and a Map for the scrambled middle, which computes no minimum move set,
    //             reached through a per-row keyed lookup. See `participants/uhtml/reconcile.tsx`.
    const { mountStage0Reconcile } = await import('../../participants/stage0/reconcile');
    const { mountUhtmlReconcile } = await import('../../participants/uhtml/reconcile');
    const { mountSinuousReconcile } = await import('../../participants/sinuous/reconcile');

    const el = (): HTMLElement => {
        const c = document.createElement('div');
        document.body.appendChild(c);
        return c;
    };

    // --- Solid: <For each={signal}> keyed by identity ---------------------------
    const SolidList = (props: { rows: () => number[] }) => (
        <ul>
            <For each={props.rows()}>{(id) => <li class="row">{`#${id}`}</li>}</For>
        </ul>
    );
    const solidPrep = (): Scenario => {
        const c = el();
        const [rows, setRows] = createSignal(IDS.slice());
        const d = render(() => SolidList({ rows }) as never, c);
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++) setRows(shuffled(IDS, seed++));
            },
            cleanup: () => {
                d();
                c.remove();
            },
        };
    };

    // --- React: keyed .map(), setState per op (flushSync) -----------------------
    const ReactList = ({ rows }: { rows: number[] }) =>
        rc(
            'ul',
            null,
            rows.map((id) => rc('li', { key: id, className: 'row' }, `#${id}`))
        );
    const reactPrep = (): Scenario => {
        const c = el();
        const r = createRoot(c);
        let setRows: (v: number[]) => void = () => {};
        const App = () => {
            const [rows, s] = useState(IDS.slice());
            setRows = s;
            return rc(ReactList, { rows });
        };
        flushSync(() => r.render(rc(App)));
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++) flushSync(() => setRows(shuffled(IDS, seed++)));
            },
            cleanup: () => {
                r.unmount();
                c.remove();
            },
        };
    };

    // --- Svelte: keyed {#each}; push a new rows array per op + flush -------------
    const sveltePrep = (): Scenario => {
        const c = el();
        const inst = svMount(SvReconcile, { target: c, props: { rows: IDS.slice() } });
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++) {
                    inst.setRows(shuffled(IDS, seed++));
                    svelteFlush();
                }
            },
            cleanup: () => {
                svUnmount(inst);
                c.remove();
            },
        };
    };

    // --- Schema core: declarative replace, reconciled by object identity ---------
    const exodraPrep = (): Scenario => {
        const c = el();
        const rows = createExoBenchSource<readonly TShuffleRow[]>(SHUFFLE_ROWS.slice());
        const dispose = mountExodraRows(c, rows);
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++)
                    rows.setValue(shuffled(IDS, seed++).map((id) => SHUFFLE_ROWS[id]));
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    const vobyPrep = (): Scenario => {
        const c = el();
        const rows = $(IDS.slice()) as { (): number[]; (v: number[]): void };
        const dispose = vRender(
            vh(
                'ul',
                {},
                vh(vFor, { values: rows }, (id: unknown) =>
                    vh('li', { class: 'row' }, () => `#${$$(id)}`)
                )
            ),
            c
        );
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++) {
                    rows(shuffled(IDS, seed++));
                    obyTick();
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // --- Marko: keyed <for>, told the new order through `update()` ---------------
    // WHY THE FLUSH IS HERE. `update()` already commits synchronously — `mount()`'s `update`
    // in marko/dist/dom.mjs wraps the input signal in `prepareEffects`, which sets the
    // rendering flag, runs the signal and drains `runRenders()` before returning. That reading
    // comes from the runtime's source, not from a measurement, and a batching framework whose
    // work escaped the timed region does not fail — it just comes out fast. So `markoFlush()`
    // (`run()` from `marko/dom`) is called per shuffle anyway: on an empty queue it is a
    // handful of statements against a 200-row reorder, and it is exactly what react, svelte
    // and voby are charged for on this same axis.
    const markoPrep = (): Scenario => {
        const c = el();
        const inst = MkReconcile.mount({ rows: IDS.slice() }, c);
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++) {
                    inst.update({ rows: shuffled(IDS, seed++) });
                    markoFlush();
                }
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    // --- Lit: keyed `repeat()`, told the new order by re-rendering the root -------
    // `repeat(rows, id => id, …)` is Lit's keyed list; the key is the row id, the same identity
    // Solid's `<For>`, React's `key={id}`, Svelte's `(id)`, Marko's `by=(id => id)` and the
    // schema core's row objects use. Its reconciler is a TWO-ENDED diff (`repeat.js`'s own
    // comment credits ivi, Vue and snabbdom): head/tail pointers matching in place while either
    // end agrees, then lazily-built key→index Maps for the scrambled middle, moving with
    // `insertPart`. That is a different algorithm from the key→row Map plus longest-increasing-
    // subsequence that Solid, Marko and the schema core run — pricing that difference is what
    // this axis is for.
    //
    // NO FLUSH: `render()` writes to the DOM inside the call (`part._$setValue(value)` is the
    // last thing it does, with no queue and no microtask in the path), so each shuffle has
    // committed by the time `update()` returns.
    const litPrep = (): Scenario => {
        const c = el();
        const inst = mountLitReconcile({ rows: IDS.slice() }, c);
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++) inst.update({ rows: shuffled(IDS, seed++) });
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    // --- stage0 / uhtml / sinuous: the same 30 shuffles, told the new order --------
    // All three are advanced exactly as Lit and Marko are — one `update({ rows })` per shuffle,
    // with the SAME `shuffled(IDS, seed)` array — so nothing about the scenario differs between
    // them. What differs is what each does with it, which is the whole point of the axis and is
    // written out in each participant's own header.
    //
    // NOTHING TO FLUSH for any of the three: stage0 writes the DOM inside `reconcile()`, sinuous
    // runs its observers inside the observable's write, and uhtml's alien-signals propagates and
    // flushes inside the write. Each shuffle has committed by the time `update()` returns.
    const stage0Prep = (): Scenario => {
        const c = el();
        const inst = mountStage0Reconcile({ rows: IDS.slice() }, c);
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++) inst.update({ rows: shuffled(IDS, seed++) });
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    const uhtmlPrep = (): Scenario => {
        const c = el();
        const inst = mountUhtmlReconcile({ rows: IDS.slice() }, c);
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++) inst.update({ rows: shuffled(IDS, seed++) });
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    const sinuousPrep = (): Scenario => {
        const c = el();
        const inst = mountSinuousReconcile({ rows: IDS.slice() }, c);
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++) inst.update({ rows: shuffled(IDS, seed++) });
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    // --- Mikado: keyed `render(newOrder)`, reconciled by "longest distance" -------
    // A Mikado view OWNS the children of the root it is mounted on (`mount()` empties that root),
    // so the `<ul>` is created here rather than by a template — the same arrangement
    // `apps/mikado/mikado.tsx` uses for the app div, and the reason the container holds the `<ul>`
    // the reference holds.
    //
    // `{ cache: true }` — Mikado's Best Practices line 1 for a keyed list, and on this axis it is
    // a FAIRNESS setting rather than a speed one. `reconcile()` calls `update()` on every row
    // whose key matched at the cursor (mikado.js:1290), and `update()` re-runs the compiled render
    // function, whose text line is `if(!_o.c||_o.c._t!==_v){ _o.n.nodeValue=_v }` (compile.js:656).
    // A shuffle changes no text at all, so with `_o.c` null — which is what no cache means — Mikado
    // would write all 200 unchanged strings back into the DOM on every one of the 30 shuffles.
    // Nobody else here does that: Solid's `<For>`, Marko's `<for by>`, Lit's `repeat()` and the
    // schema core all move nodes and leave their text alone. The cache is what buys Mikado the same
    // behaviour, and without it this axis would be timing 6000 pointless string writes.
    // (It has to be the OPTION: the runtime compiler swallows a `cache="true"` template attribute
    // without acting on it — `compile.js` `case "cache": break;`.)
    //
    // `{ pool: true }` — the other half of that same Best Practices line, and it is PROVABLY INERT
    // here, which is exactly why it is left on rather than quietly dropped to flatter the number. A
    // pool only ever holds nodes that `remove()` checked out (mikado.js:1653), and a permutation
    // removes nothing: `reconcile()` reaches `this.remove(x)` only when a row in the DOM has no
    // matching key anywhere in the new array, and every one of the 200 keys is in every shuffle. So
    // `pool_keyed` stays empty, `create()` is never called, and the one branch the flag changes —
    // `add()` vs `replace()` for an unmatched key (mikado.js:1297) — is unreachable. The setting is
    // the documented one and it costs Mikado nothing; both halves of that sentence are read off the
    // source rather than measured.
    //
    // ONE COST THAT LANDS INSIDE THE TIMED REGION AND IS NOT SHARED, stated because it is real and
    // because nothing in the output would reveal it. Mikado addresses a row's dynamic positions
    // through a per-instance array of `Cache` objects, and that array is built LAZILY: `create()`
    // runs the render function against the FACTORY and then clones it, so a clone carries no path
    // of its own, and `update()` builds one the first time it is asked to touch that node
    // (`node[MIKADO_TPL_PATH] || create_path(...)`, mikado.js:1014). Each build walks the clone.
    // Solid and the schema core resolve their node once at mount, in `prep`; Mikado resolves 200 of
    // them on the FIRST of the 30 shuffles, inside the measured region — and `abBench` builds a
    // fresh scenario per sample, so every sample pays it once. It is amortised over 30 shuffles and
    // it is not nothing.
    //
    // IT IS DELIBERATELY NOT WARMED. Calling `view.update(i, item)` 200 times in `prep` would move
    // that work out of the timed region, and it is exactly the kind of setup step a benchmark
    // author adds for the framework they want to win. Mikado's own docs call this design
    // "progressive enhancement — recycle enhancements grow as needed"; the honest thing is to leave
    // it where the library puts it and say so here.
    //
    // NOTHING TO FLUSH: `render()` is synchronous unless the `async` option or a callback asks
    // otherwise (mikado.js:680-710), and neither is used, so every shuffle has reached the DOM by
    // the time the call returns.
    const mikadoPrep = (): Scenario => {
        const c = el();
        const ul = document.createElement('ul');
        c.appendChild(ul);
        // `mount` goes in the OPTIONS, never as a later `.mount()` call: the constructor consumes
        // the template's compiled render function with `fn.pop()` and only mounting puts it back
        // (`finishFactory`, mikado.js:511), so a second view built from this template before the
        // first had mounted would come out with no render function at all. `batch` is 3 on this
        // axis — three scenarios are prepared before any of them is measured — so this is not a
        // hypothetical here.
        const view = new Mikado(MK_ROW, { mount: ul, cache: true, pool: true });
        view.render(SHUFFLE_ROWS.slice());
        let seed = 1;
        return {
            measure: () => {
                for (let o = 0; o < OPS; o++)
                    view.render(shuffled(IDS, seed++).map((id) => SHUFFLE_ROWS[id]));
            },
            cleanup: () => {
                view.destroy();
                c.remove();
            },
        };
    };

    // GATE — `marko`, against the `exodra` reference mounted beside it. This axis exists to
    // measure a RECONCILE, and the two ways a reconcile can be secretly something else both
    // come out fast: the wrong ORDER (a diff that gave up and appended), and a REBUILD wearing
    // a reconcile's timing. Neither is visible in a timing, and only the first is visible in
    // markup — so both are checked, with the same shuffles applied in lockstep. The reference's
    // own row-reuse is checked here too: a reference that rebuilt would not be one.
    //
    // Marko gets no exemption and the gate was not widened for it. Its client-mounted markup
    // carries no bookkeeping the strip would have to hide: in DOM output the compiler marks its
    // dynamic positions with `<!>` (a comment, which `markup-gate.ts` strips from both sides for
    // exactly this reason), replaces the ones that hold text with real Text nodes
    // (walk code 37 in marko/dist/dom.mjs), and emits resume attributes ONLY when the target is
    // HTML — `markNode` in the translator is a no-op for the DOM target. Delegated handlers are
    // expando properties (`el["$click"]`), not attributes. So Marko is expected to produce the
    // reference's bytes exactly, and if it does not, the diff below prints what differs.
    {
        const schC = el();
        const rows = createExoBenchSource<readonly TShuffleRow[]>(SHUFFLE_ROWS.slice());
        const dispose = mountExodraRows(schC, rows);
        const mkC = el();
        const mkInst = MkReconcile.mount({ rows: IDS.slice() }, mkC);

        gateMarkup('reconcile', 'as mounted', 'marko', schC, mkC);
        const born = new Set<Element>(Array.from(schC.querySelectorAll('li')));
        const mkBorn = new Set<Element>(Array.from(mkC.querySelectorAll('li')));
        // The node that reads `#0` at mount, kept so the keying can be PROVED after the
        // shuffles rather than assumed — see the check below.
        const mkRow0 = mkC.querySelector('li') as Element;
        let seed = 1;
        for (let o = 0; o < OPS; o++) {
            const order = shuffled(IDS, seed++);
            rows.setValue(order.map((id) => SHUFFLE_ROWS[id]));
            mkInst.update({ rows: order });
            markoFlush();
        }
        gateMarkup('reconcile', `after ${OPS} shuffles`, 'marko', schC, mkC);

        // A shuffle adds and removes NOTHING, so every one of the 200 original elements has to
        // still be in the document. Anything less is a rebuild, and a rebuild's number does not
        // belong on this axis at all.
        const survivors = Array.from(schC.querySelectorAll('li')).filter((li) =>
            born.has(li)
        ).length;
        const mkSurvivors = Array.from(mkC.querySelectorAll('li')).filter((li) =>
            mkBorn.has(li)
        ).length;
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reconcile/exodra: ${survivors}/${N} original row nodes REUSED across ${OPS} shuffles`
        );
        // AND THE KEYING ITSELF, which nothing above can see. `<for of=…>` keys by INDEX unless
        // told otherwise, and an index-keyed shuffle is a materially cheaper program: not one
        // node moves, 200 texts are rewritten instead. It passes the markup diff (the bytes are
        // the same either way) and it passes the survivor count (every node stays), so the only
        // thing that tells the two apart is WHICH node carries a given row now. Under
        // `by=(id => id)` the element that read `#0` at mount still reads `#0` — it was moved.
        // Under the index default it would be sitting where it always was, with new text in it.
        const mkRow0Text = mkRow0.textContent;
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reconcile/marko: ${mkSurvivors}/${N} original row nodes REUSED across ${OPS} shuffles; ` +
                `the element that read #0 at mount now reads ${mkRow0Text} at DOM position ` +
                `${Array.from<Element>(mkC.querySelectorAll('li')).indexOf(
                    mkRow0
                )} — the NODE moved, so the list ` +
                'really is id-keyed and not index-keyed'
        );
        dispose();
        schC.remove();
        mkInst.destroy();
        mkC.remove();
        if (survivors !== N) {
            throw new Error(
                `reconcile: schema kept only ${survivors} of ${N} original row nodes across ` +
                    `${OPS} shuffles that add and remove nothing — that is a rebuild wearing a ` +
                    "reconcile's timing, not a reconcile"
            );
        }
        if (mkSurvivors !== N) {
            throw new Error(
                `reconcile: marko kept only ${mkSurvivors} of ${N} original row nodes across ` +
                    `${OPS} shuffles that add and remove nothing — that is a rebuild wearing a ` +
                    "reconcile's timing, not a reconcile"
            );
        }
        if (mkRow0Text !== '#0') {
            throw new Error(
                `reconcile: marko's row that read #0 at mount now reads ${mkRow0Text} — the node ` +
                    'stayed put and its text was rewritten, which means the list is keyed by INDEX ' +
                    '(the `<for of=…>` default) and not by row id. That reorders nothing and is a ' +
                    'much cheaper program than the one every other participant on this axis runs'
            );
        }
    }

    // GATE — Lit, in its own block so its failure names itself, on the same terms as the block
    // above and through the same `gateMarkup`: the markup diffed against the reference as
    // mounted AND after the same 30 shuffles, the survivor count, and the keying.
    //
    // THE KEYING CHECK IS THE POINT OF THIS BLOCK. Lit's default list — a plain `.map()`, or the
    // `map` directive — commits through `ChildPart._commitIterable`, which reuses one nested
    // part per INDEX. Handed a shuffled array it moves NOTHING and rewrites 200 texts, which is
    // a materially cheaper program than the keyed reconcile every other participant here runs,
    // and it passes both of the other two checks: the bytes are the same either way, and every
    // node survives. So the only thing that tells `repeat(rows, id => id, …)` apart from the
    // default is WHICH node carries a given row afterwards — under the key function the element
    // that read `#0` at mount still reads `#0`, because it was MOVED.
    //
    // THE GATE WAS NOT WIDENED FOR LIT. It marks every dynamic position with a comment —
    // `<!--?lit$<n>$-->` where the prepared template recorded a part, `<!---->` for the two
    // markers around each list item — and `markup-gate.ts` strips comments from BOTH sides
    // for exactly that class of marker. Nothing in this row emits a
    // comment of its own, so the strip cannot hide a real divergence, and the element count
    // printed beside every result is what a strip cannot cover. NOTHING ELSE IS STRIPPED and
    // nothing else needs to be: Lit's binding markers never reach the cloned DOM as attributes
    // (`Template`'s walk calls `node.removeAttribute(name)` on the template element before
    // anything is cloned from it), and this row's one attribute, `class="row"`, is static.
    {
        const refC = el();
        const refRows = createExoBenchSource<readonly TShuffleRow[]>(SHUFFLE_ROWS.slice());
        const refDispose = mountExodraRows(refC, refRows);
        const litC = el();
        const litInst = mountLitReconcile({ rows: IDS.slice() }, litC);

        gateMarkup('reconcile', 'as mounted', 'lit', refC, litC);
        const litBorn = new Set<Element>(Array.from(litC.querySelectorAll('li')));
        const litRow0 = litC.querySelector('li') as Element;
        let seed = 1;
        for (let o = 0; o < OPS; o++) {
            const order = shuffled(IDS, seed++);
            refRows.setValue(order.map((id) => SHUFFLE_ROWS[id]));
            litInst.update({ rows: order });
        }
        gateMarkup('reconcile', `after ${OPS} shuffles`, 'lit', refC, litC);

        const litSurvivors = Array.from(litC.querySelectorAll('li')).filter((li) =>
            litBorn.has(li)
        ).length;
        const litRow0Text = litRow0.textContent;
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reconcile/lit: ${litSurvivors}/${N} original row nodes REUSED across ${OPS} shuffles; ` +
                `the element that read #0 at mount now reads ${litRow0Text} at DOM position ` +
                `${Array.from<Element>(litC.querySelectorAll('li')).indexOf(
                    litRow0
                )} — the NODE moved, so ` +
                '`repeat()` really is keyed by row id and not rendering positionally'
        );
        refDispose();
        refC.remove();
        litInst.destroy();
        litC.remove();
        if (litSurvivors !== N) {
            throw new Error(
                `reconcile: lit kept only ${litSurvivors} of ${N} original row nodes across ` +
                    `${OPS} shuffles that add and remove nothing — that is a rebuild wearing a ` +
                    "reconcile's timing, not a reconcile"
            );
        }
        if (litRow0Text !== '#0') {
            throw new Error(
                `reconcile: lit's row that read #0 at mount now reads ${litRow0Text} — the node ` +
                    'stayed put and its text was rewritten, which means the list is being rendered ' +
                    'POSITIONALLY (the plain `.map()` / `map` directive path, or `repeat()` without ' +
                    'its key function) and not keyed by row id. That reorders nothing and is a much ' +
                    'cheaper program than the one every other participant on this axis runs'
            );
        }
    }

    // GATE — Mikado, in its own block so its failure names itself, on the same terms and through
    // the same `gateMarkup`: the markup diffed against the reference as mounted AND after the same
    // 30 shuffles, the survivor count, and the keying.
    //
    // THE KEYING CHECK IS WHAT THIS BLOCK IS FOR, and Mikado's way of failing it is quieter than
    // anyone else's. Its key is a STRING PROPERTY NAME resolved at compile time — `key="data.id"`
    // becomes `template.key = "id"` and the reconciler compares `node[MIKADO_TPL_KEY]` with
    // `item[key]`. If that name ever failed to resolve, BOTH sides of that comparison would be
    // `undefined`, they would compare EQUAL, `render()` would never drop into `reconcile()` at all
    // (mikado.js:775), and every shuffle would become 200 `update()` calls rewriting text in place.
    // No node moves, no node is lost, the bytes come out identical — and the measured program is a
    // fraction of the one every other participant here runs. Only "which node carries row #0 now"
    // can see it.
    //
    // THE GATE WAS NOT WIDENED FOR MIKADO, and nothing about it needs to be. Its per-node
    // bookkeeping (`_mkp` path arrays, `_mkd`, `_mki`, the node cache) lives in EXPANDO PROPERTIES,
    // not attributes; the `key` attribute is consumed by the compiler and never written to a node;
    // this row registers no event route, so there is no `click="…"` to price the way
    // `apps/mikado/mikado-reactive.tsx` has to; and Mikado emits no comment anchors at all, so the
    // comment strip `markup-gate.ts` performs cannot be hiding anything of Mikado's. It is
    // expected to
    // produce the reference's bytes exactly.
    {
        const refC = el();
        const refRows = createExoBenchSource<readonly TShuffleRow[]>(SHUFFLE_ROWS.slice());
        const refDispose = mountExodraRows(refC, refRows);
        const mkkC = el();
        const mkkUl = document.createElement('ul');
        mkkC.appendChild(mkkUl);
        const mkkView = new Mikado(MK_ROW, { mount: mkkUl, cache: true, pool: true });
        mkkView.render(SHUFFLE_ROWS.slice());

        gateMarkup('reconcile', 'as mounted', 'mikado', refC, mkkC);
        const mkkBorn = new Set<Element>(Array.from(mkkC.querySelectorAll('li')));
        const mkkRow0 = mkkC.querySelector('li') as Element;
        let seed = 1;
        for (let o = 0; o < OPS; o++) {
            const order = shuffled(IDS, seed++);
            refRows.setValue(order.map((id) => SHUFFLE_ROWS[id]));
            mkkView.render(order.map((id) => SHUFFLE_ROWS[id]));
        }
        gateMarkup('reconcile', `after ${OPS} shuffles`, 'mikado', refC, mkkC);

        const mkkSurvivors = Array.from(mkkC.querySelectorAll('li')).filter((li) =>
            mkkBorn.has(li)
        ).length;
        const mkkRow0Text = mkkRow0.textContent;
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reconcile/mikado: ${mkkSurvivors}/${N} original row nodes REUSED across ${OPS} shuffles; ` +
                `the element that read #0 at mount now reads ${mkkRow0Text} at DOM position ` +
                `${Array.from<Element>(mkkC.querySelectorAll('li')).indexOf(
                    mkkRow0
                )} — the NODE moved, so the ` +
                'key really resolved and `reconcile()` really ran'
        );
        refDispose();
        refC.remove();
        mkkView.destroy();
        mkkC.remove();
        if (mkkSurvivors !== N) {
            throw new Error(
                `reconcile: mikado kept only ${mkkSurvivors} of ${N} original row nodes across ` +
                    `${OPS} shuffles that add and remove nothing — that is a rebuild wearing a ` +
                    "reconcile's timing, not a reconcile"
            );
        }
        if (mkkRow0Text !== '#0') {
            throw new Error(
                `reconcile: mikado's row that read #0 at mount now reads ${mkkRow0Text} — the node ` +
                    'stayed put and its text was rewritten, which means the template key never ' +
                    'resolved and `render()` never dropped into `reconcile()`. That reorders nothing ' +
                    'and is a much cheaper program than the one every other participant here runs'
            );
        }
    }

    // GATE — stage0, uhtml and sinuous, each against a fresh `exodra` reference with the same 30
    // shuffles applied in lockstep, and each in its own iteration so a failure names itself.
    //
    // IT ASKS THE SAME THREE QUESTIONS THE BLOCKS ABOVE ASK, with one of them sharpened. The
    // markup must match as mounted AND after the shuffles; the original nodes must still be
    // there; and the list must be REORDERING rather than rewriting. That last one is checked
    // here as "every original node that survived still carries the text it was born with"
    // instead of "the node that read #0 still reads #0", because it catches the same failure —
    // a positional renderer keeps all 200 nodes and rewrites 199 of their texts — while
    // remaining meaningful for a participant that does not keep every node.
    //
    // AND ONE PARTICIPANT DOES NOT KEEP EVERY NODE, which is why its bound is stated instead of
    // being quietly generalised. `sinuous/map` looks a survivor up with
    // `tmp = I.get(a[i]); if (tmp)`, so the row whose NEW index is `0` reads as not-found and is
    // destroyed and rebuilt; a shuffle puts a different row at index 0 every time, so it loses at
    // most one node per shuffle. That costs sinuous work rather than saving it — it is the only
    // participant here building anything at all on an axis where nothing is added or removed —
    // and the bound below is exactly `N - OPS`, not a blanket softening: 170 of 200 is still a
    // reconcile, 0 of 200 would still throw. stage0 and uhtml are held to all 200, like everyone
    // else. Read off `sinuous/src/map.js` at 0.32.1.
    //
    // THE GATE WAS NOT WIDENED IN ANY OTHER RESPECT. stage0 and sinuous emit no markers that
    // serialise at all (sinuous marks a reactive position with an EMPTY TEXT NODE, which
    // `innerHTML` renders as no characters), and uhtml leaves one `<!--◦-->` anchor per array
    // hole, which is the comment class `markup-gate.ts` has stripped from both sides since it was
    // written. None of the three writes a binding attribute into the DOM: stage0's `#ref`
    // attributes are removed from the template before anything is cloned from it, and uhtml's
    // interpolated attributes — `key` included — are never written into the template it
    // serialises.
    for (const [label, mount, minSurvivors] of [
        ['stage0', mountStage0Reconcile, N],
        ['uhtml', mountUhtmlReconcile, N],
        ['sinuous', mountSinuousReconcile, N - OPS],
    ] as Array<
        [
            string,
            (
                input: { rows: readonly number[] },
                host: HTMLElement
            ) => { update(input: { rows: readonly number[] }): void; destroy(): void },
            number
        ]
    >) {
        const refC = el();
        const refRows = createExoBenchSource<readonly TShuffleRow[]>(SHUFFLE_ROWS.slice());
        const refDispose = mountExodraRows(refC, refRows);
        const subC = el();
        const inst = mount({ rows: IDS.slice() }, subC);

        gateMarkup('reconcile', 'as mounted', label, refC, subC);
        // What each row node was born as: its text (so a positional rewrite is visible) and its
        // position (so "the nodes moved" is a count rather than a claim).
        const born = new Map<Element, string | null>();
        const bornAt = new Map<Element, number>();
        Array.from(subC.querySelectorAll('li')).forEach((li, i) => {
            born.set(li, li.textContent);
            bornAt.set(li, i);
        });
        let seed = 1;
        for (let o = 0; o < OPS; o++) {
            const order = shuffled(IDS, seed++);
            refRows.setValue(order.map((id) => SHUFFLE_ROWS[id]));
            inst.update({ rows: order });
        }
        gateMarkup('reconcile', `after ${OPS} shuffles`, label, refC, subC);

        const live = Array.from(subC.querySelectorAll('li'));
        const survivors = live.filter((li) => born.has(li));
        const rewritten = survivors.filter((li) => li.textContent !== born.get(li)).length;
        const moved = survivors.filter((li) => live.indexOf(li) !== bornAt.get(li)).length;

        refDispose();
        refC.remove();
        inst.destroy();
        subC.remove();

        if (survivors.length < minSurvivors) {
            throw new Error(
                `reconcile: ${label} kept only ${survivors.length} of ${N} original row nodes ` +
                    `across ${OPS} shuffles that add and remove nothing (its floor here is ` +
                    `${minSurvivors}) — that is a rebuild wearing a reconcile's timing`
            );
        }
        if (rewritten > 0) {
            throw new Error(
                `reconcile: ${label} rewrote the text of ${rewritten} surviving row nodes — the ` +
                    'nodes stayed where they were and their contents changed, which means the list ' +
                    'is being rendered POSITIONALLY rather than reordered by row identity. That is ' +
                    'a much cheaper program than the one every other participant on this axis runs'
            );
        }
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reconcile/${label}: ${survivors.length}/${N} original row nodes REUSED across ` +
                `${OPS} shuffles, ${moved} of them at a different DOM position than they were born ` +
                'at, and NOT ONE surviving node had its text rewritten — the nodes moved'
        );
    }

    await abBench(
        `RECONCILE — declarative replace of a ${N}-row keyed list, shuffled ×${OPS}`,
        `ms/${OPS} reconciles`,
        {
            exodra: exodraPrep,
            solid: solidPrep,
            svelte: sveltePrep,
            react: reactPrep,
            voby: vobyPrep,
            marko: markoPrep,
            lit: litPrep,
            mikado: mikadoPrep,
            // `stage0` is the CEILING for the LIS strategy, which this axis's subject does NOT run
            // (see the header) — that algorithm with no renderer around it. Read the LIS rows above
            // it as "stage0 plus what that library does for you", never as a framework
            // recommendation, and never read `exodra` against it as pure overhead.
            stage0: stage0Prep,
            uhtml: uhtmlPrep,
            sinuous: sinuousPrep,
        } as never,
        { rounds, batch }
    );
}
