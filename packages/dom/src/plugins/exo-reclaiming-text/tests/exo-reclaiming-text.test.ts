import { composeExoPlugins } from '@exodra/core';
// @vitest-environment jsdom
//
// THE SAFETY LAYER AS A COMPOSITION — what the core stopped paying for, and what composing the
// pack buys back.
//
// The core's text writer is one store into a Text node the instance walk resolved at build time.
// That is the fastest a text update can be and it gives up exactly one thing: other software
// replaces our Text node with markup of its own — a page translator (Chrome's built-in one,
// Google Translate, half the extensions in the world) is the common case — and from that moment
// the store succeeds against a node nobody renders while the page silently stops updating. `withExoDefaults()` puts the recovering
// writer back.
//
// EVERY CASE HERE IS WRITTEN AGAINST A BEHAVIOUR SOMEBODY COULD PLAUSIBLY DELETE, and the first
// group is deliberately an assertion about the BARE backend's loss — a test that only checked the
// pack would let the core silently become the reclaiming writer again (and slow) with nothing to
// notice.

import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend } from '../../../dom/ExoDomBackend';
import { withExoCompiler } from '../../../dom/withExoCompiler';
// `ExoDomBackend` is a CONST (`ExoDomBackendBase as unknown as TExoDomBackendConstructor`), so the name
// has no type meaning and cannot annotate a parameter. `TExoDomBackend` is the instance type that
// file exports for exactly this — see its header, and the rest of this suite, which already uses it.
import type { TExoDomBackend } from '../../../dom/ExoDomBackend';
import type { TExoCompilerApi } from '../../../dom/withExoCompiler';
import { exoDomSchemaOf } from '../../../dom/exoDomSchemaOf';
import type { TExoDomSetter } from '../../../dom/types/TExoDomSetter';
import type { TExoWritersApi } from '../../../backend/types/TExoWritersApi';
import { withExoPropertyWriters } from '../../exo-property-writers';
import { withExoDefaults } from '../../exo-default-bundle';
import { withExoReclaimingText } from '../withExoReclaimingText';

/** An exonode, reduced to the two calls these wires make. */
type TFilling = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    fillDoors(): {
        attr(port: TExoAttrPort, value: unknown): void;
        text(port: TExoTextPort, value: unknown): void;
        unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    };
};

/** One element, one text port, and one attribute port beside it. */
function buildLine(b: TExoSchemaCursor) {
    let label!: TExoTextPort;
    let mark!: TExoAttrPort;
    b.el('p', { class: 'line' }, (p) => {
        mark = p.port('data-mark');
        label = p.textPort();
    });
    return { label, mark };
}

/**
 * A component whose wire hands the driver back through a module-level cell, so a case can fill
 * the port again long after the wiring call returned — which is the shape this pack is about.
 */
let driver: {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
} | null = null;
let textPort!: TExoTextPort;

const lineShowing = (initial: string) =>
    createExoTestMachine(
        buildLine,
        (P): TExoMachineInitialState<TFilling> =>
            (c) => {
                textPort = P.label;
                c.attr(P.mark, 'm');
                const p = c.fillDoors();
                p.text(P.label, initial);
                driver = p;
            }
    );

/** Mount one instance and hand back its `<p>` and the render's disposer. */
const mount = (backend: TExoDomBackend & TExoCompilerApi, initial: string) => {
    const parent = host();
    driver = null;
    const dispose = backend.render(lineShowing(initial), parent);
    return { line: parent.querySelector('p') as HTMLElement, dispose };
};

/**
 * WHAT A PAGE TRANSLATOR DOES, in the shape that actually breaks a held node: our Text node is
 * DROPPED and the translator's own copy appears in its place, inside a `<font>` it inserted.
 * Nothing connects our node to the document afterwards. (Copied in behaviour from
 * `dom/text-binding.test.ts`, which took it from watching Chrome do it to a real page.)
 */
const replaceText = (el: Element): void => {
    const text = el.firstChild as Text;
    const font = document.createElement('font');
    font.appendChild(document.createTextNode(`[${text.data}]`));
    el.replaceChild(font, text);
};

describe('the bare backend, which is what the axes measure', () => {
    it('fills a text port and keeps filling it', () => {
        const backend = withExoCompiler(new ExoDomBackend());
        const { line, dispose } = mount(backend, 'one');
        expect(line.textContent).toBe('one');

        driver?.text(textPort, 'two');
        expect(line.textContent).toBe('two');
        dispose();
    });

    it('LOSES the page to a translator, which is the price of the one store', () => {
        // This is not a defect and it is not an accident: the core writer holds the Text node the
        // walk resolved, so once a translator has dropped that node the store lands nowhere. The
        // case exists so that the loss cannot be reintroduced — or silently repaired — unnoticed.
        const backend = withExoCompiler(new ExoDomBackend());
        const { line, dispose } = mount(backend, 'one');
        replaceText(line);
        expect(line.textContent).toBe('[one]');

        driver?.text(textPort, 'two');
        expect(line.textContent).toBe('[one]');
        expect(line.querySelector('font')).not.toBeNull();
        dispose();
    });

    it('keeps an empty Text node rather than removing it, so a later fill still lands', () => {
        // The empty write used to take the node out. With the node resolved once into the
        // instance's table, removing it would leave every later fill storing into a detached node.
        const backend = withExoCompiler(new ExoDomBackend());
        const { line, dispose } = mount(backend, '');
        expect(line.textContent).toBe('');
        expect(line.innerHTML).toBe('');
        expect(line.childNodes.length).toBe(1);
        expect(line.firstChild?.nodeType).toBe(3);

        driver?.text(textPort, 'back');
        expect(line.textContent).toBe('back');
        dispose();
    });
});

describe('with the default pack composed', () => {
    it('recovers from a translator that replaced the Text node', () => {
        const backend = withExoDefaults(withExoCompiler(new ExoDomBackend()));
        const { line, dispose } = mount(backend, 'one');
        replaceText(line);
        expect(line.textContent).toBe('[one]');

        driver?.text(textPort, 'two');
        expect(line.textContent).toBe('two');
        expect(line.querySelector('font')).toBeNull();
        dispose();
    });

    it('still writes an untranslated port with one store into the same node', () => {
        const backend = withExoDefaults(withExoCompiler(new ExoDomBackend()));
        const { line, dispose } = mount(backend, 'one');
        const node = line.firstChild;

        driver?.text(textPort, 'two');
        expect(line.textContent).toBe('two');
        // The recovery costs a lookup per write and NOT a rebuilt node: an untouched element keeps
        // the Text node it had. A pack that assigned `textContent` unconditionally would pass the
        // case above and fail this one.
        expect(line.firstChild).toBe(node);
        dispose();
    });

    it('leaves every other writer exactly as the core has it', () => {
        const backend = withExoDefaults(withExoCompiler(new ExoDomBackend()));
        const { line, dispose } = mount(backend, 'one');
        expect(line.getAttribute('data-mark')).toBe('m');
        expect(line.getAttribute('class')).toBe('line');
        dispose();
    });

    it('renders the same markup the bare backend does', () => {
        const bare = mount(withExoCompiler(new ExoDomBackend()), 'one');
        const packed = mount(withExoDefaults(withExoCompiler(new ExoDomBackend())), 'one');
        expect(packed.line.outerHTML).toBe(bare.line.outerHTML);
        bare.dispose();
        packed.dispose();
    });
});

/**
 * THE `writers` INTERFACE ITSELF — that the WRITER decides which node the port's slot holds, and that the engine
 * obeys whatever it is told rather than recognising one function it ships.
 *
 * IT IS PINNED THROUGH A PACK OF ITS OWN AND NOT THROUGH THE TWO SHIPPED ONES, deliberately. The
 * arrangement this replaced decided the question by POINTER COMPARE against `setExoText`, which is
 * indistinguishable from the declaration on every backend this package composes for itself — so a
 * case built only out of shipped packs would go on passing if the compare came back. These two
 * writers are written here, in this file, and neither of them is any value the engine imports.
 */
describe('a writers pack of its own, deciding which node it is handed', () => {
    /** One `<p>` with one text port, so the port owns the whole element's content. */
    const line = createExoTestMachine(
        buildLine,
        (): TExoMachineInitialState<TFilling> => () => undefined
    );

    /**
     * A pack whose text writer records the node it was called with, and asks for whichever one the
     * case wants. Everything else is the shipped pack's, by delegation — this is the narrowest
     * possible implementation of that interface.
     */
    const recording = (wantsTextNode: boolean, seen: Node[]) => {
        const write: TExoDomSetter = (node) => {
            seen.push(node);
        };
        if (wantsTextNode) write.takesTextNode = true;
        return {
            writers: (next: TExoWritersApi): TExoWritersApi => ({
                name: 'a case in exo-reclaiming-text.test.ts',
                attr: (name, proto, kind, at) => next.attr(name, proto, kind, at),
                markupCarries: (name, proto) => next.markupCarries(name, proto),
                text: () => write,
            }),
        };
    };

    it('hands the Text NODE to a writer that asks, and the ELEMENT to one that does not', () => {
        for (const wants of [true, false]) {
            const seen: Node[] = [];
            const backend = composeExoPlugins(
                withExoCompiler(new ExoDomBackend()),
                recording(wants, seen)
            );
            const parent = host();
            const dispose = backend.render(
                createExoTestMachine(
                    buildLine,
                    (P): TExoMachineInitialState<TFilling> =>
                        (c) => {
                            c.text(P.label, 'x');
                        }
                ),
                parent
            );

            expect(seen.length).toBe(1);
            // 3 is `Node.TEXT_NODE` and 1 is `Node.ELEMENT_NODE`. The declaration is the ONLY
            // difference between the two runs: same schema, same wire, same engine.
            expect(seen[0].nodeType).toBe(wants ? 3 : 1);
            dispose();
        }
    });

    it("puts that node in the port's ONE slot, and nothing beside it", () => {
        // `schema.elem` is the port's slot table and there is no second one. What is IN it is the
        // whole of what the declaration changed, so the assertion reads the prototype's landing
        // for the text port's slot and asks what kind of node the compiler put there.
        for (const wants of [true, false]) {
            const backend = composeExoPlugins(
                withExoCompiler(new ExoDomBackend()),
                recording(wants, [])
            );
            const schema = exoDomSchemaOf(line, backend);
            const index = line.declaration.ports.label.index;
            expect(schema.protoLandings[schema.elem[index]].nodeType).toBe(wants ? 3 : 1);
            // AND THE LANDING IS ON BOTH WALKS OR ON NEITHER. A hop appended to the render walk
            // alone is what made hydration and rendering stop sharing one table for every schema
            // holding a text port — see `hydrate-walk-emission.test.ts`, which pins the identity.
            expect(schema.hydrateWalk).toBe(schema.walk);
            expect(schema.slots).toBe(wants ? 2 : 1);
        }
    });
});

describe('composed beside another writers pack', () => {
    // The reclaiming pack wraps whatever stands in the `writers` field instead of importing the
    // shipped pack, so neither order loses the other pack's work. `createExoPropertyWriters` delegates
    // text whole, so the pair is expected to compose in both directions.
    it('keeps the property pack in either order', () => {
        for (const backend of [
            withExoReclaimingText(withExoPropertyWriters(withExoCompiler(new ExoDomBackend()))),
            withExoPropertyWriters(withExoReclaimingText(withExoCompiler(new ExoDomBackend()))),
        ]) {
            const { line, dispose } = mount(backend, 'one');
            // The property pack does not claim `data-mark` on a `<p>` — it takes hyphenated tags
            // only — so this asserts the attribute writer survived the composition rather than
            // that the property pack acted.
            expect(line.getAttribute('data-mark')).toBe('m');

            replaceText(line);
            driver?.text(textPort, 'two');
            expect(line.textContent).toBe('two');
            dispose();
        }
    });
});
