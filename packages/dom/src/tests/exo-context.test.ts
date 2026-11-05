// @vitest-environment jsdom
//
// CONTEXTS — `provide` and `inject`, on all three backends, from ONE wiring function.
//
// WHAT A CONTEXT IS HERE: a value put somewhere high up and read somewhere deep, without the
// components in between mentioning it. `exoContextToken()` hands back a token — an identity, not a
// string, so two packages cannot collide on a name — and `provide`/`inject` are METHODS ON THE
// EXONODE rather than free functions, because an exonode exists only inside a wiring and a
// method cannot be called without one. "A context exists only while wiring" is therefore
// structural rather than documented.
//
// THE CASE THE WHOLE DESIGN EXISTS FOR is at the bottom of this file: a row added to a list an
// HOUR after the render — built inside a subscriber, with no render on the stack and the
// exonode that wired the list long since serving other instances — still resolving what the
// page provided. In the browser what answers is the chain the LIST captured when it was wired
// and holds for its whole life, so a list resolves ONCE rather than once per child. On the server
// there are no nodes and nothing is ever rebuilt, so it is a module-level frame saved and restored
// around every nested build, in a `finally`.
//
// A CONTEXT NO LONGER TRAVELS THROUGH THE DOCUMENT, and cases that asserted it did have been
// deleted from this file. There used to be a second channel: a provider's frame was written into
// its element's `TExoDomChild`, and `exoContextAt` climbed `parentNode` from a mount's parent, so a
// widget mounted by a SEPARATE `render` call into a host page's element inherited what that page
// had provided. Both the walk and the field are gone. A mount now starts from `null` unless it is
// handed a chain, so a host that wants a separately-mounted widget to see a value passes it — as a
// prop to the widget's root component, or by rendering the widget inside the same render that
// provided. Everything below is that one parameter path, on all three backends.
//
// CONTEXTS ARE NOT REACTIVE BY THEMSELVES. What is provided is what a consumer holds forever;
// following data composes from above — put a SOURCE in the context and follow it in an effect.
// These cases provide plain strings deliberately, because that is what keeps the non-reactivity
// visible.
import { exoContextToken, readExoContext } from '@exodra/context';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoMachine,
    TExoPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import type { TExoContextToken } from '@exodra/context';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';
import { describe, expect, it } from 'vitest';
import { provideExoContext } from '../dom/provideExoContext';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode, TExoDomPortChildList } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/** One token for this file. Two of them would be two identities, which is the point of them. */
const THEME = exoContextToken<string>('theme');

/** Every value `inject` handed back, in the order the wires saw them. */
const seen: (string | undefined)[] = [];

/**
 * WHAT THESE WIRES ASSUME OF AN EXONODE — methods only, so the server's, the browser's and
 * hydration's all satisfy it and ONE wiring function drives all three. There is no cast
 * anywhere below: a component written against this type is a component every entry point takes.
 */
type TWiring = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    provide<TValue>(key: TExoContextToken<TValue>, value: TValue): void;
    inject<TValue>(key: TExoContextToken<TValue>): TValue | undefined;
    one(port: TExoPort, component: TExoMachine<never>): void;
    list(port: TExoPort, component: TExoMachine<never>, params: readonly unknown[]): void;
};

/**
 * A LEAF THAT PRINTS WHATEVER IT INJECTED — the witness on every backend, and mountable on its
 * own so an independent render can be asked the same question.
 *
 * Its item is a number it ignores, which is what a backend's `render` hands a top-level
 * instance; a nested caller passes `0`, the same thing `one` means by "no position among
 * siblings".
 */
const LEAF = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('span', { class: 'leaf' }, (s) => {
            label = s.textPort();
        });
        return { label };
    },
    (P): TExoMachineInitialState<TWiring> =>
        (c) => {
            const value = c.inject(THEME);
            seen.push(value);
            c.text(P.label, value ?? 'none');
        }
);

/** A component that provides NOTHING and only nests — so the value has to cross it. */
const MIDDLE = createExoTestMachine(
    (b) => {
        let slot!: TExoChildrenPort;
        b.el('section', null, (s) => {
            slot = s.childrenPort();
        });
        return { slot };
    },
    (P): TExoMachineInitialState<TWiring> =>
        (c) => {
            // Note what is NOT here: this component never mentions THEME, and the leaf below it
            // still resolves. That is the whole feature.
            c.one(P.slot, LEAF);
        }
);

/** The provider: one value, at the top, for everything under it. */
const ROOT = createExoTestMachine(
    (b) => {
        let slot!: TExoChildrenPort;
        b.el('div', { class: 'root' }, (d) => {
            slot = d.childrenPort();
        });
        return { slot };
    },
    (P): TExoMachineInitialState<TWiring> =>
        (c) => {
            c.provide(THEME, 'dark');
            c.one(P.slot, MIDDLE);
        }
);

const ROOT_MARKUP = '<div class="root"><section><span class="leaf">dark</span></section></div>';

describe('a value provided at the root reaches a nested wire', () => {
    it('on the server', () => {
        seen.length = 0;
        expect(EXO_STR.render(ROOT)).toBe(ROOT_MARKUP);
        expect(seen).toEqual(['dark']);
    });

    it('on a client render, byte for byte the same', () => {
        seen.length = 0;
        const parent = host();
        EXO_BACKEND.render(ROOT, parent);
        expect(seen).toEqual(['dark']);
        expect(parent.innerHTML).toBe(ROOT_MARKUP);
    });

    it('through hydration, without touching the markup the server sent', () => {
        const parent = host();
        parent.innerHTML = EXO_STR.render(ROOT);
        const before = parent.innerHTML;

        seen.length = 0;
        EXO_BACKEND.hydrate(ROOT, parent);

        // Hydration writes nothing but listeners, so the value cannot be observed in the DOM
        // here — what it must do is REACH the wire, because that is where a page's handlers and
        // subscriptions are made.
        expect(seen).toEqual(['dark']);
        expect(parent.innerHTML).toBe(before);
    });

    it('and nobody providing it means `undefined`, not a throw', () => {
        seen.length = 0;
        const parent = host();
        EXO_BACKEND.render(MIDDLE, parent);
        expect(seen).toEqual([undefined]);
        expect(parent.querySelector('.leaf')?.textContent).toBe('none');
    });
});

/**
 * A ROW THAT MAY SHADOW. It provides only when its item says so, prints what it then sees, and
 * nests a leaf that prints what IT sees — so the inner value is observed at the provider AND one
 * instance below it.
 */
type TRow = { readonly shadow?: string };

const ROW = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        let slot!: TExoChildrenPort;
        b.el('li', null, (li) => {
            li.el('b', null, (x) => {
                label = x.textPort();
            });
            // The children port gets a container of its OWN rather than standing next to the
            // `<b>`: this backend's hydration adopts a nested instance as the container's first
            // element child, so a port sharing its container with a static sibling is a
            // different (and already-known) gap, and this case is about contexts.
            li.el('div', null, (d) => {
                slot = d.childrenPort();
            });
        });
        return { label, slot };
    },
    (P): TExoMachineInitialState<TWiring> =>
        (c, params) => {
            const row = params as TRow;
            if (row.shadow !== undefined) c.provide(THEME, row.shadow);
            c.text(P.label, c.inject(THEME) ?? 'none');
            c.one(P.slot, LEAF);
        }
);

const ROWS: readonly TRow[] = [{ shadow: 'inner' }, {}];

const SHADOWING = createExoTestMachine(
    (b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', { class: 'rows' }, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    },
    (P): TExoMachineInitialState<TWiring> =>
        (c) => {
            c.provide(THEME, 'outer');
            // Row 0 shadows; row 1 must see the OUTER value again. On the server that is the
            // frame being restored; in the browser it is one chain per instance, which a
            // sibling's provide never touched.
            c.list(P.rows, ROW, ROWS);
        }
);

const SHADOW_MARKUP =
    '<ul class="rows">' +
    '<li><b>inner</b><div><span class="leaf">inner</span></div></li>' +
    '<li><b>outer</b><div><span class="leaf">outer</span></div></li>' +
    '</ul>';

describe('a nested provide shadows, and the outer value comes back after it', () => {
    it('on the server', () => {
        seen.length = 0;
        expect(EXO_STR.render(SHADOWING)).toBe(SHADOW_MARKUP);
        expect(seen).toEqual(['inner', 'outer']);
    });

    it('on a client render', () => {
        seen.length = 0;
        const parent = host();
        EXO_BACKEND.render(SHADOWING, parent);
        expect(parent.innerHTML).toBe(SHADOW_MARKUP);
        expect(seen).toEqual(['inner', 'outer']);
    });

    it('through hydration', () => {
        const parent = host();
        parent.innerHTML = EXO_STR.render(SHADOWING);
        seen.length = 0;
        EXO_BACKEND.hydrate(SHADOWING, parent);
        expect(seen).toEqual(['inner', 'outer']);
    });
});

describe('a wire that throws leaves no frame standing (server)', () => {
    it('so the next render sees exactly what it was given, which is nothing', () => {
        const BOOM = createExoTestMachine(
            (b) => {
                let label!: TExoTextPort;
                b.el('i', null, (i) => {
                    label = i.textPort();
                });
                return { label };
            },
            (P): TExoMachineInitialState<TWiring> =>
                (c) => {
                    c.provide(THEME, 'from a render that died');
                    c.text(P.label, 'never printed');
                    throw new Error('wire failed');
                }
        );

        expect(() => EXO_STR.render(BOOM)).toThrow('wire failed');
        seen.length = 0;
        expect(EXO_STR.render(LEAF)).toBe('<span class="leaf">none</span>');
        expect(seen).toEqual([undefined]);
    });
});

/** A row that stamps whatever it injected onto itself — visible in the DOM, per row. */
type TItem = { readonly id: string };

const STAMPED = createExoTestMachine(
    (b) => {
        let id!: TExoAttrPort;
        let theme!: TExoAttrPort;
        b.el('li', null, (li) => {
            id = li.port('data-id');
            theme = li.port('data-theme');
        });
        return { id, theme };
    },
    (P): TExoMachineInitialState<TWiring> =>
        (c, item) => {
            c.attr(P.id, (item as TItem).id);
            c.attr(P.theme, c.inject(THEME) ?? 'none');
        }
);

/** THE SERVED APPLICATION — the portable form. It provides once and places a FIXED list, which is
 *  the only list call every backend has. A page that must print on the server does not reconcile:
 *  there is no second pass to reconcile against. */
const servedAppOf = (items: readonly TItem[]) =>
    createExoTestMachine(
        (b) => {
            let rows!: TExoChildrenPort;
            b.el('div', { class: 'app' }, (d) => {
                d.el('ul', null, (ul) => {
                    rows = ul.childrenPort();
                });
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TWiring> =>
            (c) => {
                c.provide(THEME, 'dark');
                c.list(P.rows, STAMPED, items);
            }
    );

const reconcileStamped = createExoChildrenReconciler<TItem>(STAMPED);

/** THE GROWING APPLICATION — browser only, because growing is what a reconciler does and a
 *  reconciler needs a placement door. */
const appOf = (src: { getValue(): readonly TItem[]; onChange(cb: () => void): () => void }) => {
    const schema = createExoSchema((b) => {
        let rows!: TExoChildrenPort;
        b.el('div', { class: 'app' }, (d) => {
            d.el('ul', null, (ul) => {
                rows = ul.childrenPort();
            });
        });
        return { rows };
    });
    const m = createExoMachine<TExoDomNode>(schema, {
        createInitialState: (c) => {
            c.provide(THEME, 'dark');
        },
    });
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                // THE LIST IS THE RECONCILER'S, not the backend's, and that is what makes the question askable
                // at all: a row built an hour later is built by a layer over `createExoNode` + `portChildList`, from inside
                // the source's subscriber, with no render on the stack. `c.list` could not grow and so could not
                // ask.

                showRows: (c) => {
                    reconcileStamped(
                        c as TExoDomNode & TExoDomPortChildList,
                        schema.ports.rows,
                        src.getValue()
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
    return machine;
};

const themes = (parent: Element): (string | null)[] =>
    Array.from(parent.querySelectorAll('li')).map((li) => li.getAttribute('data-theme'));

describe('a row added long after the render still resolves', () => {
    it('on a client render — the case the whole design exists for', () => {
        const src = source<readonly TItem[]>([{ id: 'a' }]);
        const parent = host();
        EXO_BACKEND.render(appOf(src), parent);
        expect(themes(parent)).toEqual(['dark']);

        // AN HOUR LATER. No render is on the stack: this build happens inside the source's
        // subscriber, and the exonode that wired the list has served other instances since.
        // What answers is the chain the list captured when it attached — resolved ONCE for the
        // whole list, never once per child.
        src.setValue([{ id: 'a' }, { id: 'b' }]);
        expect(themes(parent)).toEqual(['dark', 'dark']);

        // And again from a different shape of update — a row spliced into the middle, which
        // takes a different path through the reconciler.
        src.setValue([{ id: 'a' }, { id: 'c' }, { id: 'b' }]);
        expect(themes(parent)).toEqual(['dark', 'dark', 'dark']);
    });

    it('through HYDRATION, for every row the server printed', () => {
        // THE PORTABLE FORM, because the page is printed by the server: a fixed list is what both
        // backends have, and it adopts. Growing a list AFTER hydration is a different question —
        // the adopting pass refuses to open a commanded child list — and it is not asserted here.
        const app = servedAppOf([{ id: 'a' }, { id: 'b' }]);
        const parent = host();
        parent.innerHTML = EXO_STR.render(app);
        expect(themes(parent)).toEqual(['dark', 'dark']);

        // AND THE ADOPTING PASS ANSWERS THE SAME, which is the half a forgotten mark would hide:
        // the wire runs again over the server's elements, and every row resolves the chain its
        // parent provided rather than the module-level nothing a second pass starts with.
        EXO_BACKEND.hydrate(app, parent);
        expect(themes(parent)).toEqual(['dark', 'dark']);
    });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// `provideExoContext` CALLED THE WAY THE BARREL SAYS IT IS FOR — from OUTSIDE a wiring, by a
// caller assembling a chain by hand.
//
// WHY THIS BLOCK EXISTS. `src/index.ts` exports it under a paragraph describing it as one of "the
// pieces a caller OUTSIDE a wiring needs", and until this file was written it was named by ZERO
// tests. It was exercised — both exonodes call it — but only as an INTERNAL.
describe('provideExoContext, called from outside a wiring', () => {
    const THEME = exoContextToken<string>('test.theme');

    it('links DOWNWARDS, so one frame carries everything in force at it', () => {
        // The header's last paragraph, asserted: `below` is what the provider INHERITED, so the
        // frame handed to a nested wire is the WHOLE context at that point rather than one layer
        // of it, and a consumer reads it by walking the one chain it was given.
        const OUTER = exoContextToken<string>('test.outer');
        const outer = provideExoContext(null, OUTER, 'o');
        const both = provideExoContext(outer, THEME, 't');

        expect(readExoContext(both, OUTER)).toBe('o');
        expect(readExoContext(both, THEME)).toBe('t');
    });
});
