// @vitest-environment jsdom
//
// A BOUND TEXT PORT — the one fill in this core that does NOT go through the schema's setter
// table, and therefore the one with a second implementation nobody was checking.
//
// `TExoDomNode.bind` branches on the port kind ONCE and gives text its own path: it caches
// the Text node the prototype's placeholder produced and writes `.data` into it, because
// assigning `textContent` tears the child down and allocates a new Text node and was measured
// in this project at twice the cost. Everything below the first two cases exists because that
// cached node is not ours to keep: other software edits the DOM under a live page — a page
// translator (Chrome's built-in one, Google Translate, half the browser extensions in the
// world) is the common case — and from the moment our node is moved or dropped a `.data` write
// goes on succeeding and stops reaching the screen. The guard `el.firstChild === cached && cached.nextSibling === null` is what notices,
// and the `textContent` fallback behind it is what makes the page keep updating.
//
// Every case here is written against a behaviour someone could plausibly delete while making
// the update path faster, and each says what deleting it would cost. The equivalent cases for
// the LEGACY renderer live in `src/text-binding.test.ts` and `src/translated-page.test.ts` —
// different code, and they say nothing about this one.
import { createExoSchema } from '@exodra/core';
import type { TExoSchemaCursor, TExoTextPort } from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoFollowingMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
// `ExoDomBackend` is a CONST (`ExoDomBackendBase as unknown as TExoDomBackendConstructor`), so the name
// has no type meaning and cannot annotate the parameter below. `TExoDomBackend` is the instance
// type the package exports for exactly that, and is what the rest of this suite already uses.
import type { TExoCompilerApi, TExoDomBackend } from '@exodra/dom';
import { withExoReclaimingText } from '../../plugins/exo-reclaiming-text';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

/**
 * THE SAME ENGINE WITH AN ELEMENT-HOLDING TEXT WRITER COMPOSED — needed by exactly one case below,
 * and by that one because the behaviour it pins belongs to the WRITER rather than to `bind`.
 *
 * A text port's writer says which node it is handed (`TExoDomSetter.takesTextNode`). The
 * bare backend's says the Text NODE, so the engine holds that node in the instance's table for the
 * life of the instance and nothing — `set`, `bind` or the subscriber — may detach it; an empty
 * value is stored INTO it, and since an empty Text node serialises to exactly what no node
 * serialises to, the page the server sent and the page the client builds are the same bytes either
 * way. Composing this plugin puts a writer back that holds the ELEMENT, and then nothing else is
 * holding the node, so an empty write REMOVES it — which is what the case below asserts, unchanged.
 *
 * TWO BACKENDS ARE TWO PLANS, compared by pointer, so composing this changes nothing about the
 * cases above it.
 */
const EXO_ELEMENT_TEXT_BACKEND = withExoReclaimingText(withExoCompiler(new ExoDomBackend()));

/** One element, one text port, nothing else — so the port owns the whole element's content. */
function buildLine(b: TExoSchemaCursor) {
    let label!: TExoTextPort;
    b.el('p', { class: 'line' }, (p) => {
        label = p.textPort();
    });
    return { label };
}

const LINE_SCHEMA = createExoSchema(buildLine);

const lineBoundTo = (src: {
    getValue(): unknown;
    onChange(cb: (...event: never[]) => void): () => void;
}) => {
    return createExoFollowingMachine(LINE_SCHEMA, src, (c, value) => {
        c.text(LINE_SCHEMA.ports.label, value);
    });
};

/** Mount one instance and hand back its `<p>`, plus the render's disposer. */
const mount = (
    src: { getValue(): unknown; onChange(cb: (...event: never[]) => void): () => void },
    backend: TExoDomBackend & TExoCompilerApi = EXO_BACKEND
) => {
    const parent = host();
    const dispose = backend.render(lineBoundTo(src), parent);
    return { line: parent.querySelector('p') as HTMLElement, dispose };
};

/**
 * WHAT A PAGE TRANSLATOR DOES, in its two real shapes — copied in behaviour from
 * `src/translated-page.test.ts`, which found them by watching Chrome do it to a React page.
 *
 *  - WRAP: our Text node is put INSIDE a <font> that takes its place in the tree. Our node is
 *    still in the document and still ours; it is simply no longer the element's first child.
 *  - REPLACE: our node is dropped and the translator's own copy appears in its place. Nothing
 *    connects our node to the document any more.
 */
const wrapText = (el: Element): void => {
    const text = el.firstChild as Text;
    const font = document.createElement('font');
    el.replaceChild(font, text);
    text.data = `[${text.data}]`;
    font.appendChild(text);
};

const replaceText = (el: Element): void => {
    const text = el.firstChild as Text;
    const font = document.createElement('font');
    font.appendChild(document.createTextNode(`[${text.data}]`));
    el.replaceChild(font, text);
};

describe('a bound text port', () => {
    it('shows its initial value and follows the source', () => {
        // The floor. If this breaks, nothing else in the file is worth reading — but it is
        // also the only case a coverage report would have insisted on, and the five below
        // are the ones that actually hold the design up.
        const src = source('hello');
        const { line } = mount(src);

        expect(line.textContent).toBe('hello');
        src.setValue('goodbye');
        expect(line.textContent).toBe('goodbye');
    });

    it('MUTATES the cached Text node instead of replacing it', () => {
        // THE MEASURED REASON THE TEXT PATH EXISTS AT ALL. `el.textContent = x` removes the
        // child and allocates a new Text node; `cached.data = x` writes into the one that is
        // already there, and this project measured the first at twice the cost of the second.
        // Node identity across an update is the only observable difference between the two,
        // so it is what gets asserted: an "obvious simplification" of `bind` down to a single
        // `textContent` assignment would keep every other test in this file green and hand
        // back the cost the whole path was built to avoid.
        const src = source('a');
        const { line } = mount(src);
        const node = line.firstChild;

        expect(node).not.toBeNull();
        src.setValue('b');
        expect(line.firstChild).toBe(node);
        expect(line.textContent).toBe('b');
    });

    it('keeps updating after a translator WRAPS our Text node', () => {
        // Chrome's translator moves our node inside a <font> it inserts. `cached` is still a
        // live node and `cached.data = …` would still succeed — on a node that is no longer
        // what the element renders as its first child. Delete the `el.firstChild === cached`
        // guard and this page freezes at the translated text forever, with no error anywhere:
        // the source fires, the write lands, and the screen never changes. That is the exact
        // failure this fallback was shipped for.
        const src = source('hello');
        const { line } = mount(src, EXO_ELEMENT_TEXT_BACKEND);
        wrapText(line);
        expect(line.querySelector('font')).not.toBeNull();

        src.setValue('goodbye');
        expect(line.textContent).toBe('goodbye');
        // The wrapper goes with the fallback's `textContent` write. Left standing it would keep
        // showing the translation of a value that is no longer the value.
        expect(line.querySelector('font')).toBeNull();
    });

    it('keeps updating after a translator REPLACES our Text node', () => {
        // The harsher shape: our node is not moved, it is discarded, and a copy of the text
        // appears inside the translator's element. There is nothing to recover the mapping
        // from — the most any renderer can do is notice and rebuild, which is what the
        // fallback does.
        const src = source('hello');
        const { line } = mount(src, EXO_ELEMENT_TEXT_BACKEND);
        replaceText(line);
        expect(line.textContent).toBe('[hello]');

        src.setValue('goodbye');
        expect(line.textContent).toBe('goodbye');
        expect(line.querySelector('font')).toBeNull();
    });

    it('goes back to the fast path once it has recovered', () => {
        // THE HALF OF THE FALLBACK THAT IS EASY TO LOSE. Recovering is not enough: the
        // fallback must also RE-CACHE the Text node it just made, or every update for the
        // rest of the page's life pays a `textContent` assignment. Nothing about the rendered
        // markup would show it — the text is right either way — so the assertion is again
        // node identity, this time across the update AFTER the recovery.
        const src = source('hello');
        const { line } = mount(src, EXO_ELEMENT_TEXT_BACKEND);
        wrapText(line);
        src.setValue('one');

        const recovered = line.firstChild;
        expect(recovered).not.toBeNull();
        src.setValue('two');
        expect(line.firstChild).toBe(recovered);
        expect(line.textContent).toBe('two');
    });

    it('rebuilds when a third party inserts a SIBLING next to our Text node', () => {
        // OUR NODE IS STILL THE FIRST CHILD HERE, so `el.firstChild === cached` passes and the
        // second half of the guard — `cached.nextSibling === null` — is the only thing that
        // notices. This is not a hypothetical: one translator shape hides our node with CSS
        // and appends its own next to it, and a grammar checker inserts a marker span.
        //
        // WHAT THE CURRENT CODE DOES, asserted rather than assumed: the guard fails, the
        // fallback assigns `textContent`, and the third party's node is DESTROYED along with
        // everything else inside the element.
        //
        // I judged that correct rather than a bug, and the argument is the schema's own rule:
        // an element with a text port has that port for ALL of its content (`compileExoDomSchema`
        // refuses a schema that gives it both a content port and static children), so nothing
        // legitimately shares this element. The alternative — write `.data` and leave the
        // sibling — shows the port's value next to a stale copy of the same text, which is
        // strictly worse than losing the injected node. The cost is real and worth naming: an
        // extension's marker inside a bound text element does not survive the next update.
        //
        // Dropping the `nextSibling` half of the guard is what this test exists to catch, and
        // the symptom it would produce is a page showing every value twice.
        const src = source('hello');
        const { line } = mount(src, EXO_ELEMENT_TEXT_BACKEND);
        line.appendChild(document.createElement('span'));
        expect(line.childNodes.length).toBe(2);

        src.setValue('goodbye');
        expect(line.textContent).toBe('goodbye');
        expect(line.querySelector('span')).toBeNull();
        expect(line.childNodes.length).toBe(1);
    });

    it('starts with NO Text node when the value is empty, and grows one on the first write', () => {
        // An empty text port prints nothing on the server, so the DOM backend takes the
        // prototype's placeholder character OUT rather than leaving a stray space — which is
        // what makes the two backends' bytes match for an empty value. The cost is that
        // `cached` is `null` from then on, and the FIRST non-empty write has to come back
        // through the fallback and re-cache. Break that and a component whose text starts
        // empty never shows anything at all.
        //
        // IT RUNS AGAINST THE COMPOSED BACKEND, and that is not a weakening of the case — it is
        // where the behaviour now lives. Removing the node is legal only for a writer that holds
        // the ELEMENT, because under the bare backend the engine itself holds that node in the
        // instance's slot table and a removal would leave every later `set` on this port storing
        // into nothing (`TExoDomSchema.elem`). Both spellings print the same bytes; the case above
        // this one, and the whole of `plugins/exo-reclaiming-text`, pin the bare side.
        const src = source('');
        const { line } = mount(src, EXO_ELEMENT_TEXT_BACKEND);
        expect(line.childNodes.length).toBe(0);
        expect(line.innerHTML).toBe('');

        src.setValue('now');
        expect(line.textContent).toBe('now');
        const node = line.firstChild;
        src.setValue('later');
        expect(line.firstChild).toBe(node);

        // And back to empty: the node goes away again, so the markup stays what the server
        // would have printed for an empty value.
        src.setValue('');
        expect(line.childNodes.length).toBe(0);
    });

    it('KEEPS an empty Text node on the bare backend, where the engine holds it', () => {
        // THE OTHER HALF OF THE CASE ABOVE, and the reason that one moved. The bare backend's text
        // writer asks for the Text NODE (`TExoDomSetter.takesTextNode`), so the compiler
        // resolves it once into the port's slot and the instance's node table holds it for the life
        // of the instance. A `bind` that removed it on an empty value would leave that slot holding
        // a DETACHED node: every later `c.fillDoors().text(textPort, v)` would succeed and reach
        // nothing, and `mayParkExoNode` would refuse the element for ever.
        //
        // THE BYTES ARE UNCHANGED EITHER WAY — an empty Text node serialises to exactly what no node
        // serialises to, which is what the server prints for an empty text port — so this is the
        // same page, held together differently. The assertion is the CHILD COUNT, because that is
        // the only thing that separates the two.
        const src = source('');
        const { line } = mount(src);
        expect(line.childNodes.length).toBe(1);
        expect(line.firstChild?.nodeType).toBe(3);
        expect(line.innerHTML).toBe('');

        src.setValue('now');
        expect(line.textContent).toBe('now');
        // And back to empty: the node stays, and the markup is still what the server would print.
        src.setValue('');
        expect(line.childNodes.length).toBe(1);
        expect(line.innerHTML).toBe('');
    });

    it('writes nothing more once the render is disposed', () => {
        // A subscription that outlives its render keeps the callback, the callback keeps the
        // element, and the element keeps the subtree — a table scrolled through for a minute
        // then holds every row it ever showed. `onTeardown` registers this binding with the render's
        // teardown scope precisely so the disposer can end it; if that registration is ever
        // rerouted, the page still LOOKS right, which is why the leak is asserted through
        // behaviour (the DOM stops moving) and through the source's own subscriber count.
        const src = source('hello');
        const { line, dispose } = mount(src);
        expect(src.subscribers()).toBe(1);

        dispose();
        expect(src.subscribers()).toBe(0);
        src.setValue('goodbye');
        expect(line.textContent).toBe('hello');
    });
});
