// @vitest-environment jsdom
import type { TExoSchemaCursor, TExoChildrenWiring, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, exoDomSchemaOf, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend, exoStrSchemaOf } from '@exodra/string';
import { ExoTermBackend, exoTermSchemaOf } from '@exodra/term';
import { describe, expect, it } from 'vitest';
import { createExoTestMachine } from '@exodra/test-utils';

const TERM_BACKEND = new ExoTermBackend();

function freshCard() {
    return createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let title!: TExoTextPort;
            b.el('div', { class: 'card' }, (div) => {
                title = div.textPort();
            });
            return { title };
        },
        (P) =>
            (c: TExoChildrenWiring): void => {
                c.text(P.title, 'card');
            }
    );
}

function host(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

describe('every backend keeps its schema at its own backendType on machine.forms', () => {
    it('term compiles, then the DOM compiles, and neither evicts the other', () => {
        const card = freshCard();
        expect(card.forms).toEqual([]);

        const termSchema = exoTermSchemaOf(card, TERM_BACKEND);
        expect(card.forms[TERM_BACKEND.backendType]).toBe(termSchema);

        const backend = withExoCompiler(new ExoDomBackend());
        const domSchema = exoDomSchemaOf(card, backend);

        expect(domSchema).not.toBe(termSchema);
        expect(card.forms[backend.backendType]).toBe(domSchema);
        expect(card.forms[TERM_BACKEND.backendType]).toBe(termSchema);
        expect(exoTermSchemaOf(card, TERM_BACKEND)).toBe(termSchema);
        expect(exoDomSchemaOf(card, backend)).toBe(domSchema);
    });

    it('the DOM compiles, then term compiles, and the same holds in that order', () => {
        const card = freshCard();
        const backend = withExoCompiler(new ExoDomBackend());

        const domSchema = exoDomSchemaOf(card, backend);
        const termSchema = exoTermSchemaOf(card, TERM_BACKEND);

        expect(termSchema).not.toBe(domSchema);
        expect(exoDomSchemaOf(card, backend)).toBe(domSchema);
        expect(exoTermSchemaOf(card, TERM_BACKEND)).toBe(termSchema);
    });

    it('a server backend sits beside both live-tree ones', () => {
        const card = freshCard();
        const strBackend = new ExoStrBackend();
        const strSchema = exoStrSchemaOf(card, strBackend);
        const termSchema = exoTermSchemaOf(card, TERM_BACKEND);
        const domSchema = exoDomSchemaOf(card, withExoCompiler(new ExoDomBackend()));

        expect(exoStrSchemaOf(card, strBackend)).toBe(strSchema);
        expect(strSchema).not.toBe(termSchema);
        expect(strSchema).not.toBe(domSchema);
    });

    it('two server backends compile twice, and neither evicts the other', () => {
        const card = freshCard();
        const first = new ExoStrBackend();
        const second = new ExoStrBackend();
        expect(second.backendType).not.toBe(first.backendType);

        const firstSchema = exoStrSchemaOf(card, first);
        const secondSchema = exoStrSchemaOf(card, second);

        expect(secondSchema).not.toBe(firstSchema);
        expect(exoStrSchemaOf(card, first)).toBe(firstSchema);
        expect(exoStrSchemaOf(card, second)).toBe(secondSchema);
        expect(firstSchema.backend).toBe(first);
        expect(secondSchema.backend).toBe(second);
    });

    it('hydration hangs its schema off the DOM schema it derived from', () => {
        const card = freshCard();
        const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));
        const server = new ExoStrBackend();

        const parent = host();
        parent.innerHTML = server.render(card);
        backend.hydrate(card, parent);

        const domSchema = exoDomSchemaOf(card, backend);
        const hydrateSchema = domSchema.hydrateSchema as { domSchema: unknown } | null;
        expect(hydrateSchema).not.toBeNull();
        expect(hydrateSchema).not.toBe(domSchema);
        expect(hydrateSchema?.domSchema).toBe(domSchema);

        const again = host();
        again.innerHTML = server.render(card);
        backend.hydrate(card, again);
        expect(exoDomSchemaOf(card, backend)).toBe(domSchema);
        expect(domSchema.hydrateSchema).toBe(hydrateSchema);
    });

    it('two machines never share a schema', () => {
        const first = freshCard();
        const second = freshCard();
        const strBackend = new ExoStrBackend();
        expect(exoTermSchemaOf(first, TERM_BACKEND)).not.toBe(
            exoTermSchemaOf(second, TERM_BACKEND)
        );
        expect(exoStrSchemaOf(first, strBackend)).not.toBe(exoStrSchemaOf(second, strBackend));
    });
});
