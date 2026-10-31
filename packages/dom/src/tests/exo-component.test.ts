// @vitest-environment jsdom
//
// A COMPONENT IS ONE VALUE — and this file is the assertion that the pair can no longer come
// apart.
//
// WHAT THE HOLE WAS. A component used to be carried as two arguments side by side:
// `render(schema, wire, n, parent)`, `c.list(port, schema, items, wire)`. Nothing said the
// two belonged together, and nothing could: a schema is an object, a wire is a function, and
// neither mentions the other. `render(CARD, wireRow, …)` typechecked. What happened at
// runtime was that the wire filled port objects numbered against a schema nobody was
// rendering, so its values landed in whatever port of the rendered schema happened to carry
// the same index — or, if that index did not exist, in a setter table entry that was
// `undefined`. There was no error naming the mistake and no wrong-looking line to find.
//
// WHAT CLOSES IT. `createExoTestMachine(build, makeWire)` builds the schema and then hands ITS ports
// to the factory, so the wire is derived from the shape it fills; and every entry point takes
// the component, so there is no parameter position left where a second component's wire could
// be passed. The cases below assert both halves of that: what the factory is given, and that
// the call sites have nowhere to put a wire.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoMachine,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { EXO_HYDRATE_NODE_VOCABULARY } from '../hydrate/EXO_HYDRATE_NODE_VOCABULARY';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler, withExoChildList } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoChildList(withExoCompiler(new ExoDomBackend())));
const EXO_STR = new ExoStrBackend();

type TSetting = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
};

/** The same, for the wires below that build a LIST of instances rather than filling one. */
type TListing = {
    list(port: TExoChildrenPort, component: TExoMachine<never>, count: number): void;
};

/**
 * `n` INSTANCES OF ONE COMPONENT, AS A LIST — which is how an application makes several instances
 * of one, and therefore how the cases below make them. `c.list` hands instance `i` the number `i`
 * as its index, which is what the wires above read as `i`.
 *
 * The `<div>` is the element the children port lives on, and it is the same wrapper on every
 * backend, so a case that compares two backends' markup still compares like with like.
 */
const listOf = <TPorts>(component: TExoMachine<TSetting, TPorts>, n: number) => {
    return createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let slots!: TExoChildrenPort;
            b.el('div', null, (d) => {
                slots = d.childrenPort();
            });
            return { slots };
        },
        (P): TExoMachineInitialState<TListing> =>
            (c) => {
                c.list(P.slots, component, n);
            }
    );
};

/** A card: a title and nothing else. */
const CARD = createExoTestMachine(
    (b) => {
        let title!: TExoTextPort;
        b.el('h3', null, (h) => {
            title = h.textPort();
        });
        return { title };
    },
    (P): TExoMachineInitialState<TSetting> =>
        (c, i) => {
            c.text(P.title, 'card ' + i);
        }
);

/** A row of a different shape — two ports, in a different order, with different meanings. */
const ROW = createExoTestMachine(
    (b) => {
        let id!: TExoAttrPort;
        let label!: TExoTextPort;
        b.el('li', null, (li) => {
            id = li.port('data-id');
            li.el('span', null, (span) => {
                label = span.textPort();
            });
        });
        return { id, label };
    },
    (P): TExoMachineInitialState<TSetting> =>
        (c, i) => {
            c.attr(P.id, i);
            c.text(P.label, 'row ' + i);
        }
);

describe('createExoTestMachine', () => {
    it('hands the factory the ports of ITS OWN schema, which is what ties the two halves', () => {
        let seen: unknown;
        const component = createExoTestMachine(
            (b) => {
                let title!: TExoTextPort;
                b.el('h3', null, (h) => {
                    title = h.textPort();
                });
                return { title };
            },
            (P) => {
                seen = P;
                return () => undefined;
            }
        );
        // Not "a record shaped like the ports" — THE record the build callback returned, by identity.
        // A wire cannot name a port it was not given, and it is given exactly one schema's.
        expect(seen).toBe(component.declaration.ports);
    });

    it('runs the factory ONCE, at construction, and not per instance', () => {
        let made = 0;
        const component = createExoTestMachine(
            (b) => {
                let title!: TExoTextPort;
                b.el('h3', null, (h) => {
                    title = h.textPort();
                });
                return { title };
            },
            (P): TExoMachineInitialState<TSetting> => {
                made++;
                return (c, i) => {
                    c.text(P.title, i);
                };
            }
        );
        expect(made).toBe(1);

        // Thirty instances, three backends — ten rows of one list, rendered three ways. The
        // factory is the place a component's constants are captured; if it ran per instance it
        // would be a per-row allocation, which is exactly what the fourth-argument alternative
        // (passing the ports to the wire) was rejected for.
        const TEN = listOf(component, 10);
        EXO_BACKEND.render(TEN, host());
        EXO_STR.render(TEN);
        const parent = host();
        parent.innerHTML = EXO_STR.render(TEN);
        EXO_BACKEND.hydrate(TEN, parent);
        expect(made).toBe(1);
    });

    it('carries the schema and the wire, and nothing else, so a compiler can emit one', () => {
        // The shape is public because `@exodra/babel-plugin-exodra-schema` HOISTS the schema
        // to module scope and leaves the wire where the author wrote it, which no single call
        // can do. What it emits is this object.
        expect(Object.keys(CARD).sort()).toEqual([
            'createInitialState',
            'declaration',
            'effects',
            'forms',
            'handlers',
        ]);
        expect(typeof CARD.createInitialState).toBe('function');
        expect(CARD.declaration.portList).toHaveLength(1);
    });

    it('holds no compiled schema: a machine is built before anything is compiled', () => {
        const fresh = createExoTestMachine(
            (b) => {
                b.el('div');
                return {};
            },
            () => () => undefined
        );
        expect(fresh.forms).toEqual([]);
    });
});

describe("a component cannot be filled by another component's wire", () => {
    it('because no entry point has a place to put one', () => {
        // THE STRUCTURAL CLAIM, checked the only way a runtime test can check it: by arity.
        // `backend.render(component, parent)` has no wire parameter — the four-argument form
        // `render(schema, wire, n, parent)` cannot even be written, and the TypeScript error for
        // trying is "Expected 2 arguments, but got 4".
        //
        // THE COMPOSITION IS NOT A PARAMETER EITHER, and that is the second half of the same
        // claim: what used to be a trailing argument is now the BACKEND these methods hang on, so
        // there is no argument position after `parent` at all.
        expect(EXO_BACKEND.render.length).toBe(3); // component, parent, params for its own wire
        expect(EXO_BACKEND.hydrate.length).toBe(3); // component, parent, params for its own wire
        expect(EXO_STR.render.length).toBe(1); // component

        // The same, one level down: nesting takes a component and a count, never a wire.
        //
        // READ OFF THE BACKEND ON BOTH SIDES, because that is where an exonode's methods now
        // live — on ALL THREE backends. An exonode is a literal whose `__proto__` is the composed
        // backend, so these are own properties of the object a wire reaches them through, and none
        // of the three has a class prototype to ask any more. This block used to read
        // `TExoStrNode.prototype.one.length`; `TExoStrNode` is a TYPE now, so that
        // expression was `undefined.one` at runtime and a value import of a type at compile time.
        expect(EXO_BACKEND.one.length).toBe(3); // port, component, params for its own wire
        expect(EXO_BACKEND.list.length).toBe(3); // port, component, count
        // AND NO BACKEND HAS A REACTIVE-LIST DOOR AT ALL. A list that follows a source is
        // `reconcileExoOrder` composed over `childList` and `build`, so there is no `bindList`
        // for an argument position to be wrong on — the absence is the claim.
        expect('bindList' in EXO_BACKEND).toBe(false);
        expect(EXO_BACKEND.childList.length).toBe(1); // port
        expect(EXO_STR.one.length).toBe(3);
        expect(EXO_STR.list.length).toBe(3);
        expect('bindList' in EXO_STR).toBe(false);
        expect(EXO_STR.childList.length).toBe(1);
        // AND THE ADOPTING SURFACE, ASKED OF THE PACK. `TExoHydrateNode.prototype` stood here
        // and there is no class left to have one: the adopting bodies are merge entries, so the
        // function a wire reaches is what each entry hands back. `pack[name](undefined)` is what
        // `composeExoPlugins` itself calls, with the `next` these bodies ignore.
        const adopt = EXO_HYDRATE_NODE_VOCABULARY as unknown as Record<
            string,
            (next: unknown) => (...args: unknown[]) => unknown
        >;
        expect(adopt.one(undefined).length).toBe(3);
        expect(adopt.list(undefined).length).toBe(3);
        expect(adopt.bindList).toBeUndefined();
    });

    it('and because each carries the wire that was built from its own ports', () => {
        // Two components of DIFFERENT shapes, rendered through the same entry point. Each
        // renders what its own wiring says, and there is no argument either call could have
        // been given that would have crossed them.
        const cards = host();
        const rows = host();
        EXO_BACKEND.render(listOf(CARD, 2), cards);
        EXO_BACKEND.render(listOf(ROW, 2), rows);

        expect(cards.innerHTML).toBe('<div><h3>card 0</h3><h3>card 1</h3></div>');
        expect(rows.innerHTML).toBe(
            '<div><li data-id="0"><span>row 0</span></li>' +
                '<li data-id="1"><span>row 1</span></li></div>'
        );
        expect(CARD.createInitialState).not.toBe(ROW.createInitialState);
    });

    it('and the crossed pair, if someone assembles one by hand, fails LOUDLY', () => {
        // The only way left to build a mismatched component is to write the object literal
        // yourself, and this is what that costs: CARD's schema has ONE port, ROW's wire fills
        // TWO, so the second fill reaches past the end of the setter table and throws instead
        // of silently writing into a port that happens to share an index.
        //
        // It is pinned as a test because it is the failure the old two-argument API produced
        // SILENTLY whenever the two schemas were the same size — the reason the pair became
        // one value rather than being documented more loudly.
        const crossed = { ...ROW, declaration: CARD.declaration, forms: [] };
        expect(() => EXO_BACKEND.render(crossed, host())).toThrow();
    });
});
