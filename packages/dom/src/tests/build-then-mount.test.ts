// @vitest-environment jsdom
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoEffects,
    createExoSchema,
    wireExoNode,
} from '@exodra/core';
import type { TExoMachineNode, TExoTextPort } from '@exodra/core';
import { ExoStrBackend } from '@exodra/string';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend } from '../dom/ExoDomBackend';
import { withExoCompiler } from '../dom/withExoCompiler';
import { withExoHydration } from '../hydrate/withExoHydration';

type TBadgeParams = { readonly label: string };

const BADGE_SCHEMA = createExoSchema((b) => {
    let label!: TExoTextPort;
    b.el('span', { class: 'badge' }, (span) => {
        label = span.textPort();
    });
    return { label };
});
const log: string[] = [];
const mBadge = createExoMachine<TExoMachineNode, TBadgeParams, { bumps: number }>(BADGE_SCHEMA, {
    createInitialState: () => ({ bumps: 0 }),
});
const BADGE = composeExoMachine(
    mBadge,
    (m) =>
        withExoTransitions(m, {
            bump: (c) => {
                c.state.bumps += 1;
                c.text(BADGE_SCHEMA.ports.label, 'bumped ' + c.state.bumps);
            },
        }),
    (m) =>
        withExoWire(m, (c, params) => {
            c.text(BADGE_SCHEMA.ports.label, params.label);
        }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect(() => {
                log.push('start');
                return () => log.push('stop');
            });
        })
);
const { bump } = BADGE.transitions;

const BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));

describe('buildRoot, then mountRoot', () => {
    it('builds a root nowhere, lets transitions and re-wires run on it, then places it', () => {
        const parent = document.createElement('div');
        const node = BACKEND.buildRoot(BADGE as never, { label: 'first' });
        expect(parent.innerHTML).toBe('');
        bump(node as never);
        wireExoNode(node, BADGE, { label: 'second' });
        const dispose = BACKEND.mountRoot(node, parent);
        expect(parent.innerHTML).toBe('<span class="badge">second</span>');
        wireExoNode(node, BADGE, { label: 'third' });
        expect(parent.textContent).toBe('third');
        dispose();
    });

    it('the disposer mountRoot returns stops the effects the build started, once', () => {
        log.length = 0;
        const parent = document.createElement('div');
        const dispose = BACKEND.mountRoot(
            BACKEND.buildRoot(BADGE as never, { label: 'x' }),
            parent
        );
        expect(log).toEqual(['start']);
        dispose();
        dispose();
        expect(log).toEqual(['start', 'stop']);
    });

    it('render is mountRoot over buildRoot: the same markup', () => {
        const a = document.createElement('div');
        const b = document.createElement('div');
        BACKEND.render(BADGE as never, a, { label: 'same' });
        BACKEND.mountRoot(BACKEND.buildRoot(BADGE as never, { label: 'same' }), b);
        expect(b.innerHTML).toBe(a.innerHTML);
    });
});

describe('adoptRoot, then mountRoot', () => {
    it('adopts server markup in place and re-wires the adopted node', () => {
        const parent = document.createElement('div');
        parent.innerHTML = new ExoStrBackend().render(BADGE as never, null, { label: 'server' });
        const printed = parent.firstElementChild;
        const node = BACKEND.adoptRoot(BADGE as never, parent, { label: 'server' });
        const dispose = BACKEND.mountRoot(node, parent);
        expect(parent.firstElementChild).toBe(printed);
        wireExoNode(node, BADGE, { label: 'client' });
        expect(parent.innerHTML).toBe('<span class="badge">client</span>');
        dispose();
    });
});
