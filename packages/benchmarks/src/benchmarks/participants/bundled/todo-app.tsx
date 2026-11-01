// The suite's door onto the third-party field of the shared todo app: `loadMounts()` and the five
// `AppHandle` adapters. The apps themselves are `apps/solid/solid.tsx`, `apps/react/react.tsx`,
// `apps/voby/voby.ts`, `svelte/CardsDyn.svelte` and `marko/CardsDyn.marko`; the scene, the fairness
// rules and every participant's argument are in `apps/solid/solid.md`, `apps/react/react.md` and
// `apps/voby/voby.md`.

import { createElement as rc } from 'react';
// Svelte 5 batches updates; flushSync forces them inside the timed region.
import { mount as svMount, unmount as svUnmount, flushSync as svelteFlush } from 'svelte';

import {
    CARDS,
    IDX,
    POOL,
    startsOpen,
    startCount,
    nextCount,
    TITLES,
    titleOf,
    TITLE_CLIP,
    headlineOf,
    tagsLabel,
    expandedOf,
    USERS,
    USER_IDX,
    USER_NAMES,
    userNameOf,
    CHARS_MIN,
    CHARS_SPAN,
    startChars,
    nextChars,
    cardUserOf,
    tagUserOf,
    roundUserOf,
    tagTextOf,
    tagsOfCard,
    DECKS,
    DECK_IDX,
    CARDS_PER_DECK,
    cardsOfDeck,
    deckOfCard,
    DECK_TITLES,
    deckNameOf,
    startDeckName,
    nextDeckName,
    deckUserOf,
    deckDateOf,
    DAYS_SHORT,
    DAYS_LONG,
    MONTHS_SHORT,
    MONTHS_LONG,
    dateTextOf,
    el,
    clickAll,
    type TTag,
    type AppHandle,
} from '../../shared/todo-spec';
import { noteRoundOp } from '../../shared/card-driver';
import { SolidApp } from '../../apps/solid/solid';
import type { TSlot } from '../../apps/scene/slot';
import { ReactApp, type TCharsWriter } from '../../apps/react/react';
import { createVobyApp, type TVobyObservable } from '../../apps/voby/voby';

// Every name in `todo-spec.ts` is re-exported, including the ones this file does not itself use: a
// re-export list that is nearly complete makes an importer guess which half of the spec came
// through here.
export {
    CARDS,
    IDX,
    POOL,
    startsOpen,
    startCount,
    nextCount,
    TITLES,
    titleOf,
    TITLE_CLIP,
    headlineOf,
    tagsLabel,
    expandedOf,
    USERS,
    USER_IDX,
    USER_NAMES,
    userNameOf,
    CHARS_MIN,
    CHARS_SPAN,
    startChars,
    nextChars,
    cardUserOf,
    tagUserOf,
    roundUserOf,
    tagTextOf,
    tagsOfCard,
    DECKS,
    DECK_IDX,
    CARDS_PER_DECK,
    cardsOfDeck,
    deckOfCard,
    DECK_TITLES,
    deckNameOf,
    startDeckName,
    nextDeckName,
    deckUserOf,
    deckDateOf,
    DAYS_SHORT,
    DAYS_LONG,
    MONTHS_SHORT,
    MONTHS_LONG,
    dateTextOf,
    el,
    clickAll,
};
export type { TTag, AppHandle };

/** Read a filled slot, or say which participant left it empty. A row whose advance never arrived
 *  runs a two-thirds round: 160 card writes, no shared write, and the fastest number in the table. */
function takeSlot<T>(who: string, what: string, slot: TSlot<T>): T {
    const value = slot.value;
    if (value === null) {
        throw new Error(
            `todo-app: \`${who}\` mounted without handing out its ${what} — its round would never ` +
                'move a user setting and forty tags would stand still while every gate passed.'
        );
    }
    return value;
}

export type Mounts = Record<
    | 'solid'
    | 'svelte'
    | 'react'
    | 'preact'
    | 'reactCompat'
    | 'reactCompatTemplates'
    | 'reactCompatCompiled'
    | 'reactCompatCalls'
    | 'million'
    | 'reactCompiler'
    | 'voby'
    | 'marko',
    (c: HTMLElement) => AppHandle
>;

type TReactLikeRoot = { render(children: unknown): void; unmount(): void };

/** One React-shaped row: a root, the app element, and the participant's own synchronous commit. The
 *  four rows that run React's API — React, Preact's compat layer and `@exodra/react-compat` twice —
 *  differ only in these three things, so the rest of the adapter is written once. */
function mountReactLike(
    who: string,
    c: HTMLElement,
    root: TReactLikeRoot,
    app: (slot: TSlot<TCharsWriter>) => unknown,
    sync: (run: () => void) => void
): AppHandle {
    const slot: TSlot<TCharsWriter> = { value: null };
    sync(() => root.render(app(slot)));
    const write = takeSlot(who, 'settings writer', slot);
    let round = 0;
    const advance = (): void => {
        const u = roundUserOf(round);
        round++;
        write((prev) => {
            const next = prev.slice();
            next[u] = nextChars(next[u]);
            return next;
        });
    };
    noteRoundOp(advance);
    return {
        flip: () =>
            sync(() => {
                clickAll(c, '.ren');
                clickAll(c, '.tog');
                clickAll(c, '.addtag');
                advance();
            }),
        commit: sync,
        teardown: () => root.unmount(),
    };
}

/** What `CardsDyn.marko` is mounted and updated with. The five settings are in it because Marko has
 *  no other way to receive them — see THE MARKO PROBLEM in `apps/solid/solid.md`. */
type TMarkoInput = { readonly cards: number; readonly chars: readonly number[] };

/** What `CardsDyn.svelte` exports from its instance script — the round's one app-level operation.
 *  Svelte is the only compiled participant here that can export one. */
type TSvelteAppExports = { readonly advanceUser: () => void };

// Dynamically import the runtimes and return per-framework `mount(container)` →
// { flip, teardown }. Both benches build their scenarios from this SAME map.
export async function loadMounts(): Promise<Mounts> {
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const preact = await import('preact');
    const preactCompat = await import('preact/compat');
    const preactClient = await import('preact/compat/client');
    const { ReactApp: PreactApp } = await import('../../apps/react/react.tsx?impl=preact');
    const compat = await import('@exodra/react-compat');
    const { ReactApp: CompatApp } = await import('../../apps/react/react.tsx?impl=compat');
    const { ReactJsxApp: CompiledApp } = await import('../../apps/react/react-jsx.jsx');
    const { ReactApp: CallsApp } = await import('../../apps/react/react.tsx?impl=compatCalls');
    const { ReactJsxApp: MillionApp } = await import('../../apps/react/react-jsx.jsx?impl=million');
    const { ReactJsxApp: ReactCompilerApp } = await import(
        '../../apps/react/react-jsx.jsx?impl=reactCompiler'
    );
    // Preact defers a re-render to a microtask; the participant's own commit is to run that queue
    // when the round ends, which is what `debounceRendering` hands over.
    let preactQueue: (() => void) | null = null;
    preact.options.debounceRendering = (run: () => void): void => {
        preactQueue = run;
    };
    const preactSync = (run: () => void): void => {
        run();
        const queued = preactQueue;
        preactQueue = null;
        if (queued !== null) queued();
    };
    const compatSync = (run: () => void): void => {
        compat.enableExoReactHostTemplates(false);
        try {
            compat.flushSync(run);
        } finally {
            compat.enableExoReactHostTemplates();
        }
    };
    const compatTemplatesSync = (run: () => void): void => {
        compat.enableExoReactHostTemplates();
        try {
            compat.flushSync(run);
        } finally {
            compat.enableExoReactHostTemplates();
        }
    };
    const CardsDyn = (await import('../../svelte/CardsDyn.svelte')).default;
    const voby = await import('voby');
    // voby batches DOM writes on its scheduler; `tick()` flushes them synchronously so an update
    // commits INSIDE the measured region.
    const { tick: obyTick } = (await import('oby')) as { tick: () => void };
    // The whole of what a mounted Marko template can be advanced with, read off `marko/dist/dom.mjs`'s
    // `mount`, which returns `{ get value, set value, update, destroy }`.
    const MarkoCards = (await import('../../marko/CardsDyn.marko')).default as unknown as {
        mount(
            input: TMarkoInput,
            el: HTMLElement
        ): {
            update(input: TMarkoInput): void;
            destroy(): void;
        };
    };
    // Marko batches on its own queue; `run()` drains it synchronously — same treatment as the rest.
    const { markoFlush } = await import('../../marko/flush');

    const {
        $,
        h: vh,
        render: vRender,
        For: vFor,
    } = voby as {
        $: (v: unknown) => { (): unknown; (v: unknown): void };
        h: (...a: unknown[]) => unknown;
        render: (child: unknown, parent: Element) => () => void;
        For: unknown;
    };
    const vobyApp = createVobyApp($, vh, vFor);

    return {
        solid: (c: HTMLElement) => {
            const slot: TSlot<() => void> = { value: null };
            const d = render(() => SolidApp({ slot }) as never, c);
            const advance = takeSlot('solid', 'advance closure', slot);
            noteRoundOp(advance);
            return {
                // Solid commits inside the write, so all four steps have committed by the time the
                // last call returns and this row declares no `commit`.
                flip: () => {
                    clickAll(c, '.ren');
                    clickAll(c, '.tog');
                    clickAll(c, '.addtag');
                    advance();
                },
                teardown: () => d(),
            };
        },
        svelte: (c: HTMLElement) => {
            const inst = svMount(CardsDyn, { target: c, props: { cards: CARDS } });
            const advance = (inst as unknown as TSvelteAppExports).advanceUser;
            noteRoundOp(advance);
            // The ten renames are NOT taken out here and could not be: `svMount` returns the exports
            // of the ROOT component only, so each deck declares its own rename to `card-driver.ts`
            // from its own instance script.
            return {
                flip: () => {
                    clickAll(c, '.ren');
                    clickAll(c, '.tog');
                    clickAll(c, '.addtag');
                    advance();
                    svelteFlush();
                },
                // The participant's own commit, published so an axis that calls the handlers
                // directly still stops the clock only after Svelte has committed.
                commit: (run: () => void) => {
                    run();
                    svelteFlush();
                },
                teardown: () => {
                    svUnmount(inst);
                },
            };
        },
        preact: (c: HTMLElement) =>
            mountReactLike(
                'preact',
                c,
                preactClient.createRoot(c),
                (slot) => preactCompat.createElement(PreactApp as never, { slot }),
                preactSync
            ),
        reactCompat: (c: HTMLElement) =>
            mountReactLike(
                'reactCompat',
                c,
                compat.createRoot(c),
                (slot) => compat.createElement(CompatApp, { slot }),
                compatSync
            ),
        reactCompatTemplates: (c: HTMLElement) =>
            mountReactLike(
                'reactCompatTemplates',
                c,
                compat.createRoot(c),
                (slot) => compat.createElement(CompatApp, { slot }),
                compatTemplatesSync
            ),
        reactCompatCompiled: (c: HTMLElement) =>
            mountReactLike(
                'reactCompatCompiled',
                c,
                compat.createRoot(c),
                (slot) => compat.createElement(CompiledApp, { slot }),
                compatSync
            ),
        reactCompatCalls: (c: HTMLElement) =>
            mountReactLike(
                'reactCompatCalls',
                c,
                compat.createRoot(c),
                (slot) => compat.createElement(CallsApp, { slot }),
                compatSync
            ),
        reactCompiler: (c: HTMLElement) =>
            mountReactLike(
                'reactCompiler',
                c,
                createRoot(c),
                (slot) => rc(ReactCompilerApp as never, { slot }),
                flushSync as (run: () => void) => void
            ),
        million: (c: HTMLElement) =>
            mountReactLike(
                'million',
                c,
                createRoot(c),
                (slot) => rc(MillionApp as never, { slot }),
                flushSync as (run: () => void) => void
            ),
        react: (c: HTMLElement) => {
            const r = createRoot(c);
            const slot: TSlot<TCharsWriter> = { value: null };
            flushSync(() => r.render(rc(ReactApp, { slot })));
            const write = takeSlot('react', 'settings writer', slot);
            // The round counter lives in the mount and not in the component: a React body runs again
            // on every render and an integer declared in one would be reset eighty times a round.
            let round = 0;
            const advance = (): void => {
                const u = roundUserOf(round);
                round++;
                write((prev) => {
                    const next = prev.slice();
                    next[u] = nextChars(next[u]);
                    return next;
                });
            };
            noteRoundOp(advance);
            return {
                // All four steps inside ONE `flushSync`, because that is what makes a round one
                // render pass for this participant; committing any of them separately would be
                // several passes where the direct path is one.
                flip: () =>
                    flushSync(() => {
                        clickAll(c, '.ren');
                        clickAll(c, '.tog');
                        clickAll(c, '.addtag');
                        advance();
                    }),
                commit: flushSync as (run: () => void) => void,
                teardown: () => r.unmount(),
            };
        },
        voby: (c: HTMLElement) => {
            // Per MOUNT, never at module scope, or the two apps a gate stands side by side would
            // share five cells and every round would advance one of them twice.
            const chars = USER_IDX.map((u) => $(startChars(u)) as TVobyObservable<number>);
            let round = 0;
            const advance = (): void => {
                const cell = chars[roundUserOf(round)];
                round++;
                cell(nextChars(cell()));
            };
            const dispose = vRender(vobyApp(chars), c);
            noteRoundOp(advance);
            return {
                flip: () => {
                    clickAll(c, '.ren');
                    clickAll(c, '.tog');
                    clickAll(c, '.addtag');
                    advance();
                    obyTick();
                },
                commit: (run: () => void) => {
                    run();
                    obyTick();
                },
                teardown: () => dispose(),
            };
        },
        marko: (c: HTMLElement) => {
            // Marko's five settings live out here because there is nowhere inside to reach — see THE
            // MARKO PROBLEM in `apps/solid/solid.md` before reading this row's number. The advance
            // REPLACES the array: Marko compares an input property by identity, so a mutation in
            // place would arrive as unchanged and forty tags would stand still.
            //
            // NOTHING IS REGISTERED WITH `card-driver.ts`: a card's `<let/open>` and its `onClick`
            // body are inside the compiled template, so this row is not a participant on
            // `app-update`.
            let chars: readonly number[] = USER_IDX.map(startChars);
            let round = 0;
            const inst = MarkoCards.mount({ cards: CARDS, chars }, c);
            const advance = (): void => {
                const u = roundUserOf(round);
                round++;
                const next = chars.slice();
                next[u] = nextChars(next[u]);
                chars = next;
                inst.update({ cards: CARDS, chars });
            };
            return {
                flip: () => {
                    clickAll(c, '.ren');
                    clickAll(c, '.tog');
                    clickAll(c, '.addtag');
                    advance();
                    markoFlush();
                },
                teardown: () => inst.destroy(),
            };
        },
    };
}
