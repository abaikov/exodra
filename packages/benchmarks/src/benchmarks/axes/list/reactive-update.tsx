// AXIS 3 — REACTIVE UPDATE: reflect 1000 value changes to the DOM, 3 times. Each
// framework does it idiomatically: the Exodra schema core and Solid are FINE‑GRAINED (write each of
// 1000 signals → 1000 targeted DOM writes per sweep); Svelte, React and Marko are COARSE
// (reassign / setState / `update()` one array of 1000 → one keyed reconcile per sweep). Same
// visual outcome, two models — that's the comparison.
//
// `marko` sits on the COARSE side, and that placement is the framework rather than a choice
// made about it: Marko 6 has no signal a caller can create in plain JS and hold a thousand of.
// Its reactivity is compiled per template (`<let>` declares state INSIDE an instance), and the
// only reactive value a mounted template exposes outward is the single `value` accessor of
// `Marko.MountedTemplate`. So the idiomatic way to change a thousand rendered values from
// outside is Svelte's and React's way — hand it one new array — which for Marko is
// `update({ values })`. The argument is written out in full in `marko/MkReactive.marko`.
//
// `lit` sits on the COARSE side too, for the same kind of reason. `lit-html` has no reactivity
// at all — its unit of update is a RENDER ROOT — and `LitElement`'s granularity is a PROPERTY OF
// A COMPONENT, so neither offers a signal a caller can create in plain JS and keep a thousand
// of. `@lit-labs/signals` would be Lit's fine-grained answer and it is NOT installed here
// (`node_modules/@lit-labs` holds only `ssr-dom-shim`, a transitive dependency), so adding it
// would be adding a package to make one axis read better. The idiomatic program is therefore
// Svelte's and React's — one new array per sweep — and if that package is ever installed the
// honest move is a SECOND Lit row rather than swapping this one out. The argument is written out
// in full in `participants/lit/reactive.tsx`.
//
// `mikado` IS THE ONE THIRD-PARTY PARTICIPANT THAT LANDS ON THE FINE-GRAINED SIDE, with Solid
// and the schema core, and it gets there through a feature none of the coarse ones has: REACTIVE
// PROPERTIES. Mikado's README calls it "Reactive Properties (Proxy)" and it is the second half of
// the library's own reactive story (the first is the observable array, which is a LIST feature and
// so has nothing to say on an axis where the list never changes). Writing an expression as
// `{{= data.text }}` instead of `{{ data.text }}` makes the compiler record which data field feeds
// which DOM position; `render(store)` then replaces every item in the array with a Proxy over it
// (`apply_proxy` → `proxy_create`, mikado/src/proxy.js), and from then on `store[i].text = v`
// reaches that one position with no render call, no array and no diff. That is the same shape of
// program the schema core and Solid run, which is why it belongs here and not beside Svelte and
// React.
//
// WHAT ONE WRITE ACTUALLY COSTS IT, so the number can be attributed rather than guessed: the
// Proxy's `set` trap calls `proxy_loop(handler, value, "text")`, which looks the field up in the
// template's field→sinks map, and for its one sink reads `handler.path[index]` — the per-instance
// `Cache` object whose `.n` IS the Text node — and calls `cache._t(value)`, which is
// `this.n.nodeValue = text` (mikado/src/factory.js). Then the trap writes the value back onto the
// target. So: one trap, one map lookup, one array index, one guard, one `nodeValue` store. The
// fine-grained participants' final write is the same store; everything before it is what this axis
// is comparing.
//
// `exodra` — the core shipped as `@exodra/core` + `@exodra/dom` — is the subject on the
// FINE-GRAINED side, and this is the axis that isolates the one thing it has never
// been measured doing: dispatching a single changed value to a single DOM position, 3000 times,
// with no list, no conditional and no mount anywhere in the timed region.
//
// WHAT IT ACTUALLY RUNS PER WRITE, so the number can be attributed rather than guessed. Each
// span is one row of a FIXED list (`c.list(port, C, params)`, not a reconciler — the thousand spans
// never change, so nothing here pays for a diff), and each row is a machine whose effect shows the
// text once and subscribes a closure to its own source that re-runs the `show` transition. So a
// write is: the source's single listener → one closure → one transition → one `getValue()` → one
// `c.text` store into the cached Text node.
// There is no scheduler, no queue and no flush: the write reaches the DOM inside `setValue`,
// which is why this participant needs no `flushSync` counterpart while three others do.
//
// ═══ AND `exodraDirect` BESIDE IT — THE SAME RENDERER WITH THE DISPATCH TAKEN OUT ═══
//
// The row above is what an application written the IDIOMATIC way for this renderer costs. The row
// beside it is the CEILING of the same public API: each span's wire fills its text port with
// `c.text` and hands the instance's PORT TABLE out to the caller (`c.fillDoors()`), and the sweep writes
// through that handle. No cell, no subscriber set, no closure per span, no `getValue()`. It is
// exactly the idiom `TExoFillDoors` documents and exactly the row `toggle.tsx` runs as
// `exodraDirectKept`; the whole of what it removes is the dispatch, so `exodra − exodraDirect` is
// what dispatching 3000 values costs on top of writing them.
//
// IT IS A SECOND ROW AND NOT A REPLACEMENT, for the reason every axis in this suite now states: the
// other participants are written the idiomatic way for their own frameworks, and swapping this
// renderer's row for a direct one would put a hand-written program in a table of reactive ones
// without saying so.
//
// ═══ WHAT IT IS HANDED, AND THE ONE PLACE IT DOES A SMALLER JOB — READ THIS BEFORE THE NUMBER ═══
//
// SAME INPUT: both rows are handed a per-row handle built in `prep` (the idiomatic row's array of
// sources, this one's array of port tables — Solid's `setters` and voby's `sigs` are the same
// shape and are built in the same place), and both compute `s${s}-${i}` inside the clock. Nothing
// is precomputed, nothing is reused between sweeps and no row identity is held that anybody else
// has to rediscover.
//
// SMALLER JOB, NAMED: this row DOES NOT STORE THE VALUE. Every other participant here leaves the
// new string readable — Solid's signal, React's state, the schema core's cell all hold it — and
// this one writes it into the DOM and keeps nothing. On this scene nothing reads it back, so the
// visual outcome is identical; on an application where a second position, a derived value or a
// server round-trip needed that value, this row would have to hold it somewhere and that
// somewhere is what the other rows already are. So `exodraDirect` is the floor of this axis for
// this renderer rather than a competitor to Solid or React, and it is worth saying that the same
// paragraph that keeps `stage0` off this axis ("written imperatively, its measured region would be
// a thousand `nodeValue` writes with no dispatch of any kind in front of them") applies to this row
// with one difference: the port table's `set` is a real API call through the compiled writer table,
// not a raw node write, and the row is here to say how far above the raw write that lands.
import { createSignal } from 'solid-js';
import { createElement as rc, useState } from 'react';
// Module scope, because `Mikado.compile()` is the runtime compiler and the template below has to
// be compiled ONCE for the life of the process — never inside a measured region, the same deal
// Solid's compiler and the schema core's port numbering get.
import Mikado from 'mikado';
// ═══ THIS AXIS HAS NO NULL, AND THE PAIR THAT WAS ITS NULL IS GONE — READ THIS BEFORE ANY GAP ═══
//
// A machine row stood beside `exodraDirect` here — the same job spelled as a MACHINE, with a twin
// declared a second time so the two could be subtracted to read this instrument's own zero. Both are
// removed, and the reason is a property of the library rather than of this file: NOTHING TAKES
// PROPS. `c.list(port, C, params)` is the FIXED list call every row on this axis uses; it takes a
// `TExoMachine` and one params value per row, and it hands nothing back. A row reads what it needs
// from its params, which is what the two rows below do. A declared machine has no such closure to read from and no return for
// the caller to catch. The two calls that DO hand an instance back — `c.one` and `c.build` — place
// one child each, so a row built on either of them is no longer the fixed-list program the rows
// beside it are, and a benchmark row that quietly stopped being its neighbours' program is worse
// than an absent one.
//
// WHAT WENT WITH THEM. The machine spelling's cost against the wire spelling is unmeasured on this
// axis — `toggle.tsx` still prices it on its kept block, where the panels are built one at a time by
// `c.build` and the machine form is expressible. And this axis is back to having NO CONTROL of any
// kind: `reportResolution` below now refuses on every run rather than printing a floor, so no gap in
// its table may be quoted as a SIZE until a null pair that is expressible stands in it again.
import { abBench, type Scenario } from '../../../harness';
import { gateMarkup } from '../../gates/markup-gate';
// Package specifiers — the schema core is measured out of its `dist`, never out of src.
import { type TExoFillDoors, type TExoChildrenPort, type TExoTextPort } from '@exodra/core';
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

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
/**
 * THE DIRECT ROW'S OWN SCHEMA CACHE, for the reason `app-update.tsx` gives at length: a backend
 * is the schema cache key, so sharing one would put both rows' shapes in a single cache and change
 * the `exodra` row merely because this one exists. Each row now looks up among its own shapes only,
 * which is the symmetric arrangement — and it matters more here than elsewhere, because this axis
 * declares a fresh `HOST` component per scenario and therefore adds a schema per sample either way.
 */
const DIRECT_BACKEND = withExoCompiler(new ExoDomBackend());

const NODES = 1000;
const SWEEPS = 3;

// --- the schema core's SPAN: module scope, one declaration, one compiled schema, 1000 clones ---

const SPAN_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('span', null, (s) => {
        text = s.textPort();
    });
    return { text };
});
const mSPAN = createExoMachine(SPAN_SCHEMA, {
    createInitialState: (_c: TExoDomNode, source: TExoBenchSource<string>) => source,
});
const SPAN = composeExoMachine(
    mSPAN,
    (m) =>
        withExoTransitions(m, {
            showSpan: (c) => {
                c.text(SPAN_SCHEMA.ports.text, c.state.getValue());
            },
        }),
    (m) => {
        const { showSpan } = m.transitions;
        return withExoEffects(m, (effect) => {
            effect((c) => {
                showSpan(c);
                return c.state.onChange(() => showSpan(c));
            });
        });
    }
);

// --- the schema core's SPAN, WRITTEN DIRECTLY: the same one element, filled without a cell ---------
/**
 * WHERE ONE DIRECT SPAN PUTS ITS PORT HANDLE, and what it is filled with at wire time.
 *
 * It is the exact counterpart of the ONE source per span the idiomatic row allocates, in the
 * same place and at the same count, so the two rows differ in WHAT they hold per span and not in
 * HOW MANY objects they hold. `initial` is here because the wire has to fill the port with the same
 * `v${i}` the reference mounts — a span left empty at mount would fail the markup gate, and a span
 * filled from a shared constant would be this file mounting a different app.
 */
type TDirectSpanSlot = { ports: TExoFillDoors | null; readonly initial: string };

/**
 * The same `<span>` schema again, wired WITHOUT a subscription: `c.text` for the initial fill and
 * `c.fillDoors()` handed out to the caller, which is the whole of the idiom `TExoFillDoors` documents.
 *
 * WHY THE FILL HAPPENS AT WIRE TIME rather than being left to the first sweep, and it is about not
 * quietly measuring something else: it is what makes the mounted markup identical to the
 * reference's, which is what the gate below requires before anything is timed.
 *
 * `c.fillDoors()` IS SOUND AFTER THE WIRE RETURNS and that is not an instrumentation hole cut into the
 * renderer: the table it wraps belongs to the INSTANCE, not to the pooled connector, which is the
 * property its own header exists to state. A user can write this.
 */
const DIRECT_SPAN_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('span', null, (s) => {
        text = s.textPort();
    });
    return { text };
});
const mDIRECT_SPAN = createExoMachine(DIRECT_SPAN_SCHEMA, {
    createInitialState: (c: TExoDomNode, slot: TDirectSpanSlot) => {
        c.text(DIRECT_SPAN_SCHEMA.ports.text, slot.initial);
        slot.ports = c.fillDoors();
    },
});
const DIRECT_SPAN = mDIRECT_SPAN;

// --- MIKADO'S SPAN ---------------------------------------------------------------------------
/**
 * `<span>v0</span>`, exactly the reference's bytes, bound REACTIVELY.
 *
 * `{{= }}` rather than `{{ }}` is the whole point: the compiler strips the marker and records the
 * field behind the expression as a proxy sink (`compile.js`:
 * `proxy = tmp.replace(/{{#?=+(.*)?}}/ig,"$1").trim().replace(/^data\./,"")` → the key `"text"`),
 * so after `render(store)` a write to `store[i].text` is routed straight to this span's Text node.
 * Only plain property notation is allowed inside a reactive expression — no JavaScript, not even a
 * concatenation — which is why the item's field holds the whole string rather than the template
 * composing one.
 *
 * NO KEY, NO `recycle`, SO NO `cache` AND NO `pool` — and that is not a tuning choice, it is what
 * the constructor does: `cacheable = this.recycle || !!this.key`, then
 * `this.cache = cacheable && (...)` and `this.pool = cacheable && options.pool ? 1 : 0`
 * (mikado.js:143-165). On a list that is never re-rendered, never reordered and never resized,
 * there is no key to give it and nothing to recycle, so BOTH options are forced off no matter what
 * is passed. Worth saying anyway because the cache is the one that would have changed a number:
 * with it on, `_t` compares before writing (`if(this.c._t === text) return`, factory.js) — and
 * since every sweep writes a value no span has ever held, that compare could never match. It would
 * be pure cost. The setting that is unavailable here is also the setting that would not have
 * helped.
 */
const MK_SPAN: ReturnType<typeof Mikado.compile> = Mikado.compile('<span>{{= data.text }}</span>');

/** What `MK_SPAN` reads. After `render()` every one of these is a Proxy over the original object. */
interface TMikadoValue {
    text: string;
}

export async function benchmarkReactiveUpdate(rounds = 100, batch = 1): Promise<void> {
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const SvReactive = (await import('../../svelte/SvReactive.svelte')).default;
    // Svelte 5 batches async — flushSync per sweep so the work lands in-region.
    const { mount: svMount, unmount: svUnmount, flushSync: flush } = await import('svelte');
    // Voby: fine-grained like Solid; oby.tick() flushes its scheduler synchronously
    // (its flushSync) so a sweep commits inside the measured region.
    const {
        $,
        h: vh,
        render: vRender,
    } = (await import('voby')) as unknown as {
        $: (v: unknown) => { (): unknown; (v: unknown): void };
        h: (...a: unknown[]) => unknown;
        render: (child: unknown, parent: Element) => () => void;
    };
    const { tick: obyTick } = (await import('oby')) as unknown as { tick: () => void };
    // Marko 6, authored as a `.marko` component and compiled by the inline compiler in
    // `vite.config.ts` — the same wiring `todo-app.tsx` uses for the app axes.
    const MkReactive = (await import('../../marko/MkReactive.marko')).default as unknown as {
        mount(
            input: { values: readonly string[] },
            el: HTMLElement
        ): { update(input: { values: readonly string[] }): void; destroy(): void };
    };
    // Marko batches on its own queue; `run()` drains it synchronously. See the note at the
    // Marko scenario below for why it is called even though `update()` already drains.
    const { markoFlush } = await import('../../marko/flush');
    // Lit 3, through `lit-html`'s standalone `render()`. It has no counterpart to the flushes
    // above and needs none: `render()` commits inside the call, with no queue and no microtask
    // in the path. Why Lit is on the COARSE side of this axis — and that `@lit-labs/signals`,
    // which would be its fine-grained answer, is not installed here — is argued in
    // `participants/lit/reactive.tsx`.
    const { mountLitReactive } = await import('../../participants/lit/reactive');
    // uhtml and sinuous, BOTH ON THE FINE-GRAINED SIDE, with Solid, voby, Mikado's reactive
    // properties and the schema core. Neither is here by analogy with Lit: both ship a reactive
    // primitive a caller can create in plain JS and hold a thousand of — sinuous's `observable()`
    // is the library's own core, and uhtml exports `signal`/`computed`/`effect` (alien-signals)
    // from the package itself, which is exactly what `participants/lit/reactive.tsx` says Lit lacks
    // unless `@lit-labs/signals` is installed. What each write reaches is in each file's header:
    // sinuous re-runs the one closure `insert()` subscribed for that span, uhtml re-runs that
    // span's COMPONENT effect and diffs its hole.
    //
    // STAGE0 IS DELIBERATELY ABSENT FROM THIS AXIS, and the reason is in `apps/stage0/stage0.md`:
    // it has no reactivity at all. Written imperatively, its measured region would be a thousand
    // `node.nodeValue = v` writes with no dispatch of any kind in front of them — which is not a
    // participant, it is this axis's floor, and `participants/floor/app.ts` is where that
    // belongs. A row that cannot lose is not a comparison.
    const { mountUhtmlReactive } = await import('../../participants/uhtml/reactive');
    const { mountSinuousReactive } = await import('../../participants/sinuous/reactive');

    const el = (): HTMLElement => {
        const c = document.createElement('div');
        document.body.appendChild(c);
        return c;
    };
    const sweepValues = (s: number): string[] =>
        Array.from({ length: NODES }, (_, i) => `s${s}-${i}`);

    const solidPrep = (): Scenario => {
        const setters: Array<(v: string) => void> = [];
        const c = el();
        const App = () => (
            <div>
                {Array.from({ length: NODES }, (_, i) => {
                    const [t, set] = createSignal(`v${i}`);
                    setters.push(set);
                    return <span>{t()}</span>;
                })}
            </div>
        );
        const dispose = render(() => App() as never, c);
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++)
                    for (let i = 0; i < NODES; i++) setters[i](`s${s}-${i}`);
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    const sveltePrep = (): Scenario => {
        const c = el();
        const inst = svMount(SvReactive, {
            target: c,
            props: { values: Array.from({ length: NODES }, (_, i) => `v${i}`) },
        });
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++) {
                    inst.setValues(sweepValues(s));
                    flush();
                }
            },
            cleanup: () => {
                svUnmount(inst);
                c.remove();
            },
        };
    };

    const reactPrep = (): Scenario => {
        const c = el();
        let setValues: (v: string[]) => void = () => {};
        const App = (): unknown => {
            const [vals, set] = useState(() => Array.from({ length: NODES }, (_, i) => `v${i}`));
            setValues = set;
            return rc(
                'div',
                null,
                vals.map((v, i) => rc('span', { key: i }, v))
            );
        };
        const root = createRoot(c);
        flushSync(() => root.render(rc(App as never)));
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++) flushSync(() => setValues(sweepValues(s)));
            },
            cleanup: () => {
                root.unmount();
                c.remove();
            },
        };
    };

    // --- Schema core: 1000 rows of a FIXED list, each bound to its own source -----
    // The shell is built per scenario because its wiring names THIS scenario's thousand
    // sources; that build is setup, and the timed region is the writes. `SPAN`, which is what
    // the mount clones a thousand times, stays module-level with one compiled schema.
    const mountExodraSpans = (
        c: HTMLElement,
        sigs: readonly TExoBenchSource<string>[]
    ): (() => void) => {
        const HOST_SCHEMA = createExoSchema((b) => {
            let kids!: TExoChildrenPort;
            b.el('div', null, (host) => {
                kids = host.childrenPort();
            });
            return { kids };
        });
        const mHOST = createExoMachine<TExoDomNode>(HOST_SCHEMA, {
            createInitialState: (cc) => {
                cc.list(HOST_SCHEMA.ports.kids, SPAN, sigs);
            },
        });
        const HOST = mHOST;
        return EXO_BACKEND.render(HOST, c);
    };
    const exodraSigs = () => Array.from({ length: NODES }, (_, i) => createExoBenchSource(`v${i}`));

    const exodraPrep = (): Scenario => {
        const sigs = exodraSigs();
        const c = el();
        const dispose = mountExodraSpans(c, sigs);
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++)
                    for (let i = 0; i < NODES; i++) sigs[i].setValue(`s${s}-${i}`);
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // --- Schema core, WRITTEN DIRECTLY: the same 1000 rows of the same FIXED list, no cell ----------
    // The shell is built per scenario for the same reason the idiomatic one is — its wiring names
    // THIS scenario's thousand slots — and `DIRECT_SPAN`, which the mount clones a thousand times,
    // stays module-level with one compiled schema. The list is `cc.list`, the FIXED call, exactly
    // as the row above: the thousand spans never change, so neither row pays for a diff.
    const mountExodraDirectSpans = (
        c: HTMLElement,
        slots: readonly TDirectSpanSlot[]
    ): (() => void) => {
        const HOST_SCHEMA2 = createExoSchema((b) => {
            let kids!: TExoChildrenPort;
            b.el('div', null, (host) => {
                kids = host.childrenPort();
            });
            return { kids };
        });
        const mHOST2 = createExoMachine<TExoDomNode>(HOST_SCHEMA2, {
            createInitialState: (cc) => {
                cc.list(HOST_SCHEMA2.ports.kids, DIRECT_SPAN, slots);
            },
        });
        const HOST = mHOST2;
        return DIRECT_BACKEND.render(HOST, c);
    };
    const exodraDirectSlots = (): TDirectSpanSlot[] =>
        Array.from({ length: NODES }, (_, i) => ({ ports: null, initial: `v${i}` }));

    const exodraDirectPrep = (): Scenario => {
        const slots = exodraDirectSlots();
        const c = el();
        const dispose = mountExodraDirectSpans(c, slots);
        // Read out of the slots ONCE, in setup — for the reason `toggle.tsx`'s `exodraDirectKept`
        // reads its own out once, and the reason Solid's `setters` and voby's `sigs` are arrays
        // built in prep: a `slots[i].ports!` inside the region would be timing this file's optional
        // chaining rather than the renderer. The port itself is a module-level value on the
        // component, so naming it costs nothing per write.
        const ports: TExoFillDoors[] = slots.map((s) => s.ports as TExoFillDoors);
        const text = DIRECT_SPAN_SCHEMA.ports.text;
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++)
                    for (let i = 0; i < NODES; i++) ports[i].text(text, `s${s}-${i}`);
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    const vobyPrep = (): Scenario => {
        const sigs = Array.from({ length: NODES }, (_, i) => $(`v${i}`));
        const c = el();
        const dispose = vRender(
            vh(
                'div',
                {},
                sigs.map((s) => vh('span', {}, s))
            ),
            c
        );
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++) {
                    for (let i = 0; i < NODES; i++) sigs[i](`s${s}-${i}`);
                    obyTick();
                }
            },
            cleanup: () => {
                dispose();
                c.remove();
            },
        };
    };

    // --- Marko: one new array per sweep through `update()` -----------------------
    // WHAT THE SWEEP ACTUALLY COSTS IT, so the number can be attributed rather than guessed:
    // the array's 1000 index keys all match the previous sweep's, so `loop()` in
    // marko/dist/dom.mjs consumes the whole list in its common-prefix scan and returns BEFORE
    // the move phase — not one node is inserted or removed. What is left is the per-row body
    // signal writing `.data` on its own cached Text node, a thousand times. That is the same
    // final write the fine-grained participants make; the difference this axis is measuring is
    // everything Marko does to get there from one array.
    //
    // WHY THE FLUSH IS HERE. `update()` already commits synchronously — `mount()`'s `update`
    // in marko/dist/dom.mjs wraps the input signal in `prepareEffects`, which sets the
    // rendering flag, runs the signal and drains `runRenders()` before returning. That is read
    // off the runtime's source, not measured, and a batching framework whose work escaped the
    // timed region does not fail — it comes out fast. So `markoFlush()` (`run()` from
    // `marko/dom`) is called per sweep anyway; three calls on an empty queue against 3000
    // value changes is nothing, and it is the same treatment svelte/react/voby get here.
    const markoPrep = (): Scenario => {
        const c = el();
        const inst = MkReactive.mount(
            { values: Array.from({ length: NODES }, (_, i) => `v${i}`) },
            c
        );
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++) {
                    inst.update({ values: sweepValues(s) });
                    markoFlush();
                }
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    // --- Lit: one new array of 1000 template results per sweep, through `render()` ---
    // COARSE, with Svelte, React and Marko. `lit-html` has no reactivity of its own and
    // `LitElement`'s granularity is a property of a component, so there is no signal a caller
    // can hold a thousand of — the full argument, and the check that `@lit-labs/signals` is not
    // installed, is in `participants/lit/reactive.tsx`.
    //
    // WHAT THE SWEEP COSTS IT, so the number can be attributed rather than guessed: the array is
    // committed by `ChildPart._commitIterable`, which keeps one nested part per INDEX and reuses
    // them positionally — the same index keying React (`key={i}`), Svelte (`(i)`) and Marko (the
    // `<for of=…>` default) use here. Same length every sweep, so not one marker is inserted or
    // removed; each item part sees a `TemplateResult` whose prepared `Template` it already holds
    // and re-binds instead of re-cloning; and the span's text part ends in
    // `startNode.nextSibling.data = value`. That last write is the same one the fine-grained
    // participants make, and the gate below pins it rather than asserting it.
    //
    // NO FLUSH: `render()` writes to the DOM inside the call (`part._$setValue(value)` is the
    // last thing it does), so a sweep has committed by the time `update()` returns.
    const litPrep = (): Scenario => {
        const c = el();
        const inst = mountLitReactive(
            { values: Array.from({ length: NODES }, (_, i) => `v${i}`) },
            c
        );
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++) inst.update({ values: sweepValues(s) });
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    // --- uhtml: 1000 signals, one component per span, written one at a time --------
    // The sweep is the SAME loop the fine-grained participants run — one write per value, no
    // array anywhere — because uhtml has a signal to write. Each write re-runs exactly one
    // `Span` component's effect, which allocates one `Hole`, diffs it against the live one and
    // ends in `node.data = value`. The mount, including the thousand component effects, is in
    // `prep`, outside the timed region, exactly as every other participant's is.
    //
    // NOTHING TO FLUSH: alien-signals' `signalOper` propagates and calls `flush()` inside the
    // write whenever no `batch()` is open.
    const uhtmlPrep = (): Scenario => {
        const c = el();
        const inst = mountUhtmlReactive(
            { values: Array.from({ length: NODES }, (_, i) => `v${i}`) },
            c
        );
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++) {
                    for (let i = 0; i < NODES; i++) inst.values[i].value = `s${s}-${i}`;
                }
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    // --- sinuous: 1000 observables, written one at a time --------------------------
    // Same loop again. A write runs the observable's observer set inline — the one closure
    // `insert()` subscribed for that span — which re-enters `insert`, takes its string fast path
    // and does `(endMark.previousSibling || el.lastChild).data = value`.
    //
    // NOTHING TO FLUSH: `sinuous/observable` calls its observers before the write returns; the
    // only way to defer is the explicit `transaction()`, which is not used.
    const sinuousPrep = (): Scenario => {
        const c = el();
        const inst = mountSinuousReactive(
            { values: Array.from({ length: NODES }, (_, i) => `v${i}`) },
            c
        );
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++) {
                    for (let i = 0; i < NODES; i++) inst.values[i](`s${s}-${i}`);
                }
            },
            cleanup: () => {
                inst.destroy();
                c.remove();
            },
        };
    };

    // --- Mikado: 1000 reactive properties, written one at a time ------------------
    // A Mikado view OWNS the children of the root it is mounted on (`mount()` empties that root),
    // so the `<div>` is created here rather than by a template — the same arrangement
    // `apps/mikado/mikado.tsx` uses for the app div, and the reason the container holds the
    // `<div>` the reference holds.
    //
    // THE STORE IS READ BACK OUT OF ITSELF AFTER `render()`, and that is not a detail: `render()`
    // walks the array it was handed and REPLACES each entry with a Proxy over it
    // (`data[x] = apply_proxy(this, this.dom[x], item)`, mikado.js:800), so the objects the loop
    // below writes to are the ones sitting in `store` afterwards, not the ones put in before.
    // Holding the pre-render objects would write to plain properties and reach no DOM at all —
    // a mistake that produces a perfect mount, a very fast measured region, and a DOM that never
    // changes again. The gate below is what would catch it.
    //
    // WHAT IS PAID AT MOUNT AND NOT HERE: proxifying a row calls `create_path()` on the CLONE
    // (factory.js:35) to build that instance's own array of `Cache` objects, one per dynamic
    // position — a DOM walk per span, a thousand of them. The other fine-grained participants
    // resolve their node once too. All of it is in `prep`, outside the timed region, for every
    // participant on this axis.
    //
    // NOTHING TO FLUSH: the Proxy's `set` trap writes to `nodeValue` before it returns. There is no
    // queue, no scheduler and no batching in the path — Mikado's own `transaction()` exists
    // precisely because writes are otherwise applied immediately — which is why this participant
    // needs no `flushSync` counterpart while three others on this axis do.
    const mikadoPrep = (): Scenario => {
        const c = el();
        const host = document.createElement('div');
        c.appendChild(host);
        // `mount` in the OPTIONS rather than a later `.mount()` call: the constructor consumes the
        // template's compiled render function with `fn.pop()` and only mounting puts it back
        // (`finishFactory`, mikado.js:511), so a second view built from this template before the
        // first had mounted would come out with no render function at all.
        const view = new Mikado(MK_SPAN, { mount: host });
        const store: TMikadoValue[] = Array.from({ length: NODES }, (_, i) => ({ text: `v${i}` }));
        view.render(store);
        return {
            measure: () => {
                for (let s = 0; s < SWEEPS; s++) {
                    for (let i = 0; i < NODES; i++) store[i].text = `s${s}-${i}`;
                }
            },
            cleanup: () => {
                view.destroy();
                c.remove();
            },
        };
    };

    // GATE — `marko`, against the `exodra` reference mounted beside it and with the same sweep
    // applied to both. A binding that never subscribed produces a perfectly good-looking mount,
    // a very fast measured region and a DOM that stops changing after the first paint. So the
    // markup is diffed BOTH as mounted and after a full sweep, and the second diff is the one
    // that matters.
    {
        const sigs = exodraSigs();
        const schC = el();
        const dispose = mountExodraSpans(schC, sigs);
        // Marko goes through the SAME gate, and it is the one that matters most for a coarse
        // participant: a sweep that quietly did not reach the DOM is invisible in a timing and
        // shows up here as a thousand stale `v…` strings. The gate was not widened for it —
        // Marko's DOM-target output carries no attributes of its own (`markNode` in the
        // translator writes resume attributes only for the HTML target) and marks its dynamic
        // positions with `<!>` comments, which `markup-gate.ts` strips from both sides.
        const mkC = el();
        const mkInst = MkReactive.mount(
            { values: Array.from({ length: NODES }, (_, i) => `v${i}`) },
            mkC
        );

        gateMarkup('reactive-update', 'as mounted', 'marko', schC, mkC);
        const mkFirstSpan = mkC.querySelector('span') as HTMLElement;
        const mkFirstText = mkFirstSpan.firstChild;
        for (let i = 0; i < NODES; i++) sigs[i].setValue(`s0-${i}`);
        mkInst.update({ values: sweepValues(0) });
        markoFlush();
        gateMarkup('reactive-update', 'after one full sweep', 'marko', schC, mkC);
        // ...and the same Text-node question asked of the schema core below, asked of Marko:
        // its `_text` writes `node.data`, so a sweep should MUTATE the span's Text node rather
        // than replace it. If that ever stops being true, this participant is doing more work
        // per value than the header above says it is.
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reactive-update/marko: a sweep ${
                mkFirstSpan.firstChild === mkFirstText
                    ? 'MUTATED the same Text node (.data path)'
                    : 'REPLACED the text node'
            }`
        );
        mkInst.destroy();
        mkC.remove();

        // ...and that the write really reached the SAME Text node rather than replacing the
        // span's contents — the `.data` path this core claims, not the `textContent` fallback.
        const span = schC.querySelector('span') as HTMLElement;
        const before = span.firstChild;
        sigs[0].setValue('probe');
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reactive-update/exodra: a write ${
                span.firstChild === before
                    ? 'MUTATED the cached Text node (.data path)'
                    : 'REPLACED the text node (textContent fallback — slower, and worth knowing)'
            }`
        );

        dispose();
        schC.remove();
    }

    // GATE — Lit, in its own block so that its failure names itself (the same reason `toggle.tsx`
    // gives each newcomer its own), against a fresh reference and with the same sweep applied to
    // both. It is the gate that matters most for a coarse participant: a sweep that quietly did
    // not reach the DOM is invisible in a timing and shows up here as a thousand stale `v…`
    // strings.
    //
    // THE GATE WAS NOT WIDENED. Lit marks every dynamic position with a comment —
    // `<!--?lit$<n>$-->` where the prepared template recorded a part, and `<!---->` for the two
    // markers `_commitIterable` puts around each of the thousand items — so a Lit tree here
    // carries roughly 2001 comments the reference does not have. `markup-gate.ts` strips
    // comments from BOTH sides for exactly that class of marker, and
    // nothing in this span emits a comment of its own, so the strip cannot hide a real
    // divergence; the element count printed beside every result is what it cannot cover.
    // NOTHING ELSE IS STRIPPED: Lit's binding markers never reach the cloned DOM as attributes
    // (`Template`'s walk calls `node.removeAttribute(name)` on the template element), and this
    // span has no attributes at all.
    {
        const refSigs = exodraSigs();
        const refC = el();
        const refDispose = mountExodraSpans(refC, refSigs);
        const litC = el();
        const litInst = mountLitReactive(
            { values: Array.from({ length: NODES }, (_, i) => `v${i}`) },
            litC
        );

        gateMarkup('reactive-update', 'as mounted', 'lit', refC, litC);
        const litFirstSpan = litC.querySelector('span') as HTMLElement;
        // The span's ONLY child at mount is the part's start marker followed by the Text node,
        // so the text is `firstChild.nextSibling` rather than `firstChild` — that comment is
        // Lit's part marker, and it is the same node the `.data` write below is relative to.
        const litFirstText = litFirstSpan.lastChild;
        for (let i = 0; i < NODES; i++) refSigs[i].setValue(`s0-${i}`);
        litInst.update({ values: sweepValues(0) });
        gateMarkup('reactive-update', 'after one full sweep', 'lit', refC, litC);
        // ...and the same Text-node question asked of the schema core and of Marko, asked of
        // Lit: `_commitText` writes `startNode.nextSibling.data` when the previously committed
        // value was also a primitive, so a sweep should MUTATE the span's Text node rather than
        // replace it. If that ever stops being true, this participant is doing more work per
        // value than the note beside its scenario says it is.
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reactive-update/lit: a sweep ${
                litFirstSpan.lastChild === litFirstText
                    ? 'MUTATED the same Text node (.data path)'
                    : 'REPLACED the text node'
            }`
        );

        refDispose();
        refC.remove();
        litInst.destroy();
        litC.remove();
    }

    // GATE — Mikado, in its own block so that its failure names itself, against a fresh reference
    // and with the same sweep applied to both.
    //
    // IT IS THE GATE THIS PARTICIPANT NEEDS MOST, because the way a reactive-property row fails is
    // silent and fast. If the store were held from BEFORE `render()` proxified it, or if `{{= }}`
    // had been written as `{{ }}`, or if the field name behind the expression had not resolved,
    // then every one of the 3000 writes would land on a plain object property and reach no DOM at
    // all. The mount would be perfect, the measured region would be the fastest number on the axis,
    // and the DOM would simply stop changing after the first paint. That is exactly why the markup
    // is diffed twice — as mounted AND after a full sweep — and the second diff is the one that
    // matters.
    //
    // THE GATE WAS NOT WIDENED FOR MIKADO, and nothing about it needs to be. Its per-node
    // bookkeeping (`_mkp` path arrays, the node cache, the proxy marker) lives in EXPANDO
    // PROPERTIES, not attributes; this span carries no attribute at all and registers no event
    // route, so there is no `click="…"` to price the way `apps/mikado/mikado-reactive.tsx` has to;
    // and Mikado emits no comment anchors, so the comment strip `markup-gate.ts` performs cannot
    // be hiding anything of Mikado's.
    {
        const refSigs = exodraSigs();
        const refC = el();
        const refDispose = mountExodraSpans(refC, refSigs);
        const mkkC = el();
        const mkkHost = document.createElement('div');
        mkkC.appendChild(mkkHost);
        const mkkView = new Mikado(MK_SPAN, { mount: mkkHost });
        const mkkStore: TMikadoValue[] = Array.from({ length: NODES }, (_, i) => ({
            text: `v${i}`,
        }));
        mkkView.render(mkkStore);

        gateMarkup('reactive-update', 'as mounted', 'mikado', refC, mkkC);
        const mkkFirstSpan = mkkC.querySelector('span') as HTMLElement;
        const mkkFirstText = mkkFirstSpan.firstChild;
        for (let i = 0; i < NODES; i++) {
            refSigs[i].setValue(`s0-${i}`);
            mkkStore[i].text = `s0-${i}`;
        }
        gateMarkup('reactive-update', 'after one full sweep', 'mikado', refC, mkkC);
        // ...and the same Text-node question asked of the schema core, Marko and Lit, asked of
        // Mikado: its `_t` sink is `this.n.nodeValue = text` where `.n` is the Text node the
        // instance's path resolved once, so a sweep should MUTATE that node rather than replace
        // it. If that ever stops being true, this participant is doing more work per value than
        // the header above says it is.
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reactive-update/mikado: a sweep ${
                mkkFirstSpan.firstChild === mkkFirstText
                    ? 'MUTATED the same Text node (nodeValue path)'
                    : 'REPLACED the text node'
            }`
        );

        refDispose();
        refC.remove();
        mkkView.destroy();
        mkkC.remove();
    }

    // GATE — uhtml and sinuous, each against a fresh `exodra` reference with the same full sweep
    // applied to both, and each in its own iteration so a failure names itself. It is the gate a
    // fine-grained participant needs most, because the way one fails is silent and fast: a
    // binding that never subscribed produces a perfect mount, the quickest measured region on the
    // axis, and a DOM that stops changing after the first paint. That is why the markup is
    // diffed twice — as mounted AND after a full sweep — and the second diff is the one that
    // matters.
    //
    // AND THE `.data` CLAIM IS PINNED rather than asserted in prose, the same way it is for the
    // schema core, Marko, Lit and Mikado: a sweep must MUTATE the span's Text node, not replace
    // it. Both of these participants reach that node differently (uhtml holds it in a WeakMap
    // keyed by the hole's marker, sinuous finds it as `endMark.previousSibling`), and if either
    // ever stopped mutating in place it would be doing more work per value than its header says.
    //
    // THE GATE WAS NOT WIDENED. Sinuous's only marker is an EMPTY TEXT NODE, which serialises to
    // no characters at all; uhtml's is one `<!--◦-->` anchor for the array of spans, and
    // `markup-gate.ts` strips comments from both sides. Neither writes an attribute: this span
    // has none, and uhtml's interpolated attributes never reach the template it serialises.
    //
    // THE DIRECT SCHEMA-CORE ROW TAKES THE SAME GATE, and it needs it as much as any
    // third-party participant does: it is the row with no subscription in it, so the failure mode
    // "the sweep never reached the DOM" has nothing at all standing between it and a very fast
    // number. The `.data` check below is the second half of that — a port table's `set` on a text
    // port goes through the compiled writer, and if it ever stopped mutating the cached Text node
    // this row would be doing more work per value than its header claims. Nothing is forgiven for
    // it: it emits no markers, because it is the reference's OWN schema shape.
    for (const [label, mount] of [
        [
            'exodraDirect',
            (values: readonly string[], host: HTMLElement) => {
                const slots: TDirectSpanSlot[] = values.map((v) => ({ ports: null, initial: v }));
                const dispose = mountExodraDirectSpans(host, slots);
                const ports: TExoFillDoors[] = slots.map((s) => s.ports as TExoFillDoors);
                const text = DIRECT_SPAN_SCHEMA.ports.text;
                return {
                    sweepTo: (s: number): void => {
                        for (let i = 0; i < NODES; i++) ports[i].text(text, `s${s}-${i}`);
                    },
                    destroy: (): void => dispose(),
                };
            },
        ],
        [
            'uhtml',
            (values: readonly string[], host: HTMLElement) => {
                const inst = mountUhtmlReactive({ values }, host);
                return {
                    sweepTo: (s: number): void => {
                        for (let i = 0; i < NODES; i++) inst.values[i].value = `s${s}-${i}`;
                    },
                    destroy: (): void => inst.destroy(),
                };
            },
        ],
        [
            'sinuous',
            (values: readonly string[], host: HTMLElement) => {
                const inst = mountSinuousReactive({ values }, host);
                return {
                    sweepTo: (s: number): void => {
                        for (let i = 0; i < NODES; i++) inst.values[i](`s${s}-${i}`);
                    },
                    destroy: (): void => inst.destroy(),
                };
            },
        ],
    ] as Array<
        [
            string,
            (
                values: readonly string[],
                host: HTMLElement
            ) => { sweepTo(s: number): void; destroy(): void }
        ]
    >) {
        const refSigs = exodraSigs();
        const refC = el();
        const refDispose = mountExodraSpans(refC, refSigs);
        const subC = el();
        const inst = mount(
            Array.from({ length: NODES }, (_, i) => `v${i}`),
            subC
        );

        gateMarkup('reactive-update', 'as mounted', label, refC, subC);
        const firstSpan = subC.querySelector('span') as HTMLElement;
        const firstText = firstSpan.firstChild;
        for (let i = 0; i < NODES; i++) refSigs[i].setValue(`s0-${i}`);
        inst.sweepTo(0);
        gateMarkup('reactive-update', 'after one full sweep', label, refC, subC);
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate reactive-update/${label}: a sweep ${
                firstSpan.firstChild === firstText
                    ? 'MUTATED the same Text node (.data path)'
                    : 'REPLACED the text node'
            }`
        );

        refDispose();
        refC.remove();
        inst.destroy();
        subC.remove();
    }

    await abBench(
        `REACTIVE UPDATE — ${NODES} nodes × ${SWEEPS} sweeps`,
        `ms/${NODES * SWEEPS} value changes`,
        {
            exodra: exodraPrep,
            // THE CEILING OF THIS RENDERER'S OWN API, declared beside the row it bounds so the two
            // are sampled back to back in every round. `exodra − exodraDirect` is what dispatching
            // 3000 values costs on top of writing them. READ ITS HEADER FIRST: it does one thing
            // less than every other row here — it does not STORE the value — so it is this
            // renderer's own floor rather than a competitor to Solid or React.
            exodraDirect: exodraDirectPrep,
            solid: solidPrep,
            svelte: sveltePrep,
            react: reactPrep,
            voby: vobyPrep,
            marko: markoPrep,
            lit: litPrep,
            mikado: mikadoPrep,
            // FINE-GRAINED side, with exodra/solid/voby/mikado. stage0 is absent from this axis
            // on purpose — it has no reactivity, so its row would be the floor rather than a
            // participant; the reason is stated where the imports are.
            uhtml: uhtmlPrep,
            sinuous: sinuousPrep,
        } as never,
        { rounds, batch }
    );

    // WHAT THIS RUN COULD TELL APART AT ALL — printed AFTER the table, because it is a statement
    // about it. The answer is NOTHING, and the block below says so rather than leaving the reader to
    // notice that no control was printed.
    reportResolution();
}

/**
 * THE CONTROL BLOCK — what the instrument returned when nothing was there.
 *
 * IT HAS NOTHING TO RETURN, AND THAT IS THE STATEMENT. The null pair this axis carried was a machine
 * row and a second declaration of it, and both are gone: a machine takes no props and `c.list` hands
 * nothing back, so a thousand machine rows in a fixed list can be given neither their starting text
 * nor a handle for the sweep to write through. The two calls that DO hand an instance back place one
 * child each, which is not the program the rows beside it run.
 *
 * SO THIS PRINTS A REFUSAL ON EVERY RUN rather than a floor. Nothing here is a placeholder waiting
 * for a flag: the rows do not exist anywhere in this file, and the table above is a ranking until a
 * null pair that IS expressible on this axis is written and sampled beside its row.
 */
function reportResolution(): void {
    // eslint-disable-next-line no-console
    const line = (s: string): void => console.log(s);
    line('');
    line(
        '\u274c reactive-update: NO RESOLUTION — this axis carries no null pair at all, so nothing ' +
            'here says how small a difference the instrument can see and NO GAP IN THE TABLE ABOVE ' +
            'MAY BE QUOTED AS A SIZE. The pair that used to stand here was `exodraMachineDirect` ' +
            'and its twin; both were removed because a machine takes no props and `c.list` returns ' +
            'nothing, so a thousand machine rows in a fixed list cannot be seeded with `v${i}` and ' +
            'cannot be reached by the sweep. Read every gap above as an ORDERING, never as a size.'
    );
    line(
        '  WHAT WOULD BRING ONE BACK, so this is a gap with a named resolution rather than a ' +
            'shrug: a null pair on this axis needs two separately declared copies of ONE program ' +
            'that this axis`s fixed-list shape can express. `exodraDirect` and a second declaration ' +
            'of it would do it and costs two more rows; the machine spelling would need a list call ' +
            'that hands its rows back, which does not exist and is not owed.'
    );
}
