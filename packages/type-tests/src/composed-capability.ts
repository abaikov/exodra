// Every component-taking parameter reads `TExoMachine<this, …>`, so the demand is bounded by what
// the composition holds: `TExoMachine` is CONTRAVARIANT in its exonode under `strict`,
// `machine.wire` being an arrow-typed property.
// SILENT FAILURE MODE: a `this` type is legal in an interface or a class and NOWHERE else; in a
// type alias it answers TS2526, and TypeScript degrades the erroring `this` to `any`, at which
// point `TExoMachine<any, …>` accepts every component there is. The CONTROLS separate the cases.
//
// THE PACK UNDER TEST IS DEFINED HERE, so the check leans on no shipped pack's surface: following a
// source is a machine effect, and `writers`/`events`/`hydration` replace a FIELD on the backend
// rather than a door a wire can name. The witness for "a wire may demand a pack" is the pack an
// application writes — which is the shape this file has to check.
import { composeExoPlugins } from '@exodra/core';
import type {
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoTextPort,
    TExoWiring,
    TExoMachineInitialState,
} from '@exodra/core';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { createExoTestMachine } from '@exodra/test-utils';

/** What the pack below adds to an exonode — one door, named, so a wire can demand it. */
type TExoHighlightApi = {
    highlight(port: TExoTextPort): void;
};

/**
 * A PACK THE WAY AN APPLICATION WRITES ONE: one name, one factory, and the factory ignores `next`
 * because nothing shipped owns this name. `composeExoPlugins` writes it as an OWN property of the
 * backend, so an instance reaches it through the backend as its prototype.
 */
const HIGHLIGHT_PACK = {
    highlight: () =>
        function (this: TExoDomNode, port: TExoTextPort): void {
            this.text(port, '★');
        },
};

const withExoHighlight = <TBase extends object>(base: TBase) =>
    composeExoPlugins(base, HIGHLIGHT_PACK);

// BARE `TExoDomNode`: naming the highlight half would DEMAND the pack, and a row wanting less than
// the receiver has still goes in.
const ROW = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('li', null, (li) => {
            label = li.textPort();
        });
        return { label };
    },
    (P) =>
        (c: TExoDomNode, params: unknown): void => {
            c.text(P.label, 'row ' + String(params));
        }
);

// Spelled BY HAND: an unannotated `(c) => …` has no inference site and lands on `unknown`, which
// satisfies every negative directive below while nothing is checked.
const HIGHLIGHTS = createExoTestMachine(
    (b) => {
        let title!: TExoTextPort;
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            title = ul.textPort();
            rows = ul.childrenPort();
        });
        return { title, rows };
    },
    (P): TExoMachineInitialState<TExoDomNode & TExoHighlightApi> =>
        (c): void => {
            c.highlight(P.title);
            c.list(P.rows, ROW, Array.from({ length: 1 }));
        }
);

const host = null as unknown as Element;

const composed = withExoHighlight(withExoCompiler(new ExoDomBackend()));
composed.render(HIGHLIGHTS, host);

// Packs composed the other way round: the name still resolves, the prototype being the backend.
const hydrating = withExoHighlight(withExoHydration(withExoCompiler(new ExoDomBackend())));
hydrating.hydrate(HIGHLIGHTS, host);

// A directive over a line with no error is TS2578, which is what makes this file fail loudly when a
// check is relaxed.
const bare = withExoCompiler(new ExoDomBackend());
// @ts-expect-error a component wanting `c.highlight` may not be rendered by a backend without the pack
bare.render(HIGHLIGHTS, host);

const bareHydrating = withExoHydration(withExoCompiler(new ExoDomBackend()));
// @ts-expect-error and the same at the other entry point, for the same reason
bareHydrating.hydrate(HIGHLIGHTS, host);

// THE CONTROL: without it the directives above pass equally well if `render` refused EVERYTHING.
const FILLS_ONE_PORT = createExoTestMachine(
    (b) => {
        let title!: TExoTextPort;
        b.el('h1', null, (h1) => {
            title = h1.textPort();
        });
        return { title };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c): void => {
            c.text(P.title, 'hello');
        }
);
bare.render(FILLS_ONE_PORT, host);
composed.render(FILLS_ONE_PORT, host);

// `c.one`, `c.list` and `c.build` take components too, so the refusal must hold from INSIDE one.
const NESTS_HIGHLIGHTS = createExoTestMachine(
    (b) => {
        let slot!: TExoChildrenPort;
        b.el('div', null, (d) => {
            slot = d.childrenPort();
        });
        return { slot };
    },
    (P): TExoMachineInitialState<TExoDomNode & TExoHighlightApi> =>
        (c): void => {
            c.one(P.slot, HIGHLIGHTS);
        }
);
composed.render(NESTS_HIGHLIGHTS, host);

const NESTS_HIGHLIGHTS_WITHOUT_PACK = createExoTestMachine(
    (b) => {
        let slot!: TExoChildrenPort;
        b.el('div', null, (d) => {
            slot = d.childrenPort();
        });
        return { slot };
    },
    (P): TExoMachineInitialState<TExoDomNode> =>
        (c): void => {
            // @ts-expect-error this exonode has no `highlight`, so it may not build a child that wants one
            c.one(P.slot, HIGHLIGHTS);
        }
);
bare.render(NESTS_HIGHLIGHTS_WITHOUT_PACK, host);

// The same contravariance one layer down: naming the MINIMAL surface on the component-taking calls
// admits a child that demands less than the parent, and refuses every child asking for MORE.

const HIGHLIGHTING_CHILD = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('span', null, (sp) => {
            label = sp.textPort();
        });
        return { label };
    },
    (P) =>
        (c: TExoChildrenWiring & TExoHighlightApi): void => {
            c.highlight(P.label);
        }
);

const HIGHLIGHTING_PARENT = createExoTestMachine(
    (b) => {
        let slot!: TExoChildrenPort;
        b.el('div', null, (d) => {
            slot = d.childrenPort();
        });
        return { slot };
    },
    (P) =>
        (c: TExoChildrenWiring & TExoHighlightApi): void => {
            c.one(P.slot, HIGHLIGHTING_CHILD);
            c.list(P.slot, HIGHLIGHTING_CHILD, Array.from({ length: 1 }));
        }
);
void HIGHLIGHTING_PARENT;

const PLAIN_PARENT = createExoTestMachine(
    (b) => {
        let slot!: TExoChildrenPort;
        b.el('div', null, (d) => {
            slot = d.childrenPort();
        });
        return { slot };
    },
    (P) =>
        (c: TExoChildrenWiring): void => {
            // @ts-expect-error this receiver has no `highlight`, so it may not build a child that needs one
            c.one(P.slot, HIGHLIGHTING_CHILD);
        }
);
void PLAIN_PARENT;

// A name NOTHING in this tree provides: if either directive below goes quiet, `this` has degraded
// to `any` and every other result in this file is vacuous.
const ABSURD = createExoTestMachine(
    (b) => {
        let title!: TExoTextPort;
        b.el('h1', null, (h1) => {
            title = h1.textPort();
        });
        return { title };
    },
    (
            P
        ): TExoMachineInitialState<
            TExoDomNode & TExoHighlightApi & { nothingProvidesThis(): void }
        > =>
        (c): void => {
            c.text(P.title, 'x');
            c.nothingProvidesThis();
        }
);

// @ts-expect-error no composition in this tree provides `nothingProvidesThis`
composed.render(ABSURD, host);
// @ts-expect-error and a bare backend does not either — the control for the entry point
bare.render(ABSURD, host);
