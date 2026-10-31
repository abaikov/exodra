// @vitest-environment jsdom
import { composeExoPlugins, createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoTextPort } from '@exodra/core';
import { ExoStrBackend } from '@exodra/string';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend } from '../dom/ExoDomBackend';
import { withExoCompiler } from '../dom/withExoCompiler';
import { withExoHydration } from '../hydrate/withExoHydration';
import { EXO_DOM_FOREIGN_VOCABULARY } from '../foreign/constants/EXO_DOM_FOREIGN_VOCABULARY';
import { exoForeignNode } from '../foreign/exoForeignNode';
import type { TExoDomNode } from '../dom/EXO_DOM_NODE_VOCABULARY';

const GREETING_SCHEMA = createExoSchema((b) => {
    let who!: TExoTextPort;
    let slot!: TExoChildrenPort;
    b.el('p', null, (p) => {
        p.el('b', null, (bold) => {
            who = bold.textPort();
        });
        p.el('span', null, (span) => {
            slot = span.childrenPort();
        });
    });
    return { who, slot };
});
const mGreeting = createExoMachineBuilder<TExoDomNode>(GREETING_SCHEMA);
mGreeting.createInitialState((c) => {
    c.text(GREETING_SCHEMA.ports.who, 'world');
});
const GREETING = mGreeting.done();

describe('one composeExoPlugins call takes function packs and vocabularies in order', () => {
    const backend = composeExoPlugins(
        new ExoDomBackend(),
        withExoCompiler,
        withExoHydration,
        EXO_DOM_FOREIGN_VOCABULARY
    );

    it('renders', () => {
        const parent = document.createElement('div');
        backend.render(GREETING, parent);
        expect(parent.innerHTML).toBe('<p><b>world</b><span></span></p>');
    });

    it('hydrates the server markup by identity', () => {
        const parent = document.createElement('div');
        parent.innerHTML = new ExoStrBackend().render(GREETING as never);
        const served = parent.querySelector('p');
        backend.hydrate(GREETING, parent);
        expect(parent.querySelector('p')).toBe(served);
    });

    it('carries the vocabulary composed after the function packs', () => {
        expect(typeof backend.foreign).toBe('function');
        const canvas = document.createElement('canvas');
        expect(exoForeignNode).toBeTypeOf('function');
        expect(canvas.tagName).toBe('CANVAS');
    });
});
