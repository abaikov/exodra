// @vitest-environment jsdom
//
// `ExoOutlet` is a MODULE-LEVEL CONSTANT (`exoOutlet('div')` evaluated at import time), so its
// schema is built once for the whole process and shared by every application that passes it. A test
// that only ever built its own outlet would not notice a shared instance going wrong, and "the
// second router's outlet shows the first router's page" is the shape that failure takes.
import { describe, expect, it } from 'vitest';
import { createExoMachine, composeExoMachine, withExoWire, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachine, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { host } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import {
    ExoOutlet,
    createExoMemoryHistory,
    createExoRouter,
    exoOutlet,
    provideExoRouter,
} from '../../index';
import type { TExoRoute, TExoRouteMatch, TExoRouter } from '../../types';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

interface TNestingNode extends TExoMachineNode {
    one(port: TExoChildrenPort, machine: TExoMachine<never>): void;
}

const page = (name: string) => {
    const schema = createExoSchema((b) => {
        let label!: TExoTextPort;
        b.el('p', { class: name }, (p) => {
            label = p.textPort();
        });
        return { label };
    });
    const m = createExoMachine<TExoMachineNode, TExoRouteMatch>(schema);
    return composeExoMachine(m, (m) =>
        withExoWire(m, (c, match) => {
            c.text(schema.ports.label, name + ' at ' + match.pathname);
        })
    );
};

const ROUTES: readonly TExoRoute[] = [
    { path: '/', component: page('home') },
    { path: '/about', component: page('about') },
];

const routerAt = (path: string): TExoRouter =>
    createExoRouter(ROUTES, { history: createExoMemoryHistory(path) });

const shellAround = (router: TExoRouter, boundary: TExoMachine<never>) => {
    const schema = createExoSchema((b) => {
        let body!: TExoChildrenPort;
        b.el('div', { class: 'shell' }, (d) => {
            body = d.childrenPort();
        });
        return { body };
    });
    const m = createExoMachine<TNestingNode>(schema, {
        createInitialState: (c) => {
            provideExoRouter(c, router);
            c.one(schema.ports.body, boundary);
        },
    });
    return m;
};

const markupOf = (component: TExoMachine<never>): string => {
    const parent = host();
    EXO_BACKEND.render(component as never, parent);
    return parent.innerHTML;
};

const HOME_MARKUP = '<p class="home">home at /</p>';

describe('ExoOutlet — the ready-made boundary', () => {
    it('is a <div>, and draws the matched page inside it', () => {
        expect(markupOf(shellAround(routerAt('/'), ExoOutlet))).toBe(
            `<div class="shell"><div>${HOME_MARKUP}</div></div>`
        );
    });

    it('is exactly `exoOutlet("div")` — same markup, different tag is the only difference', () => {
        // THE README'S CLAIM ABOUT THE THREE SPELLINGS, as bytes. If `ExoOutlet` ever stopped being
        // the factory's output — a second implementation, a wrapper, an extra attribute — this
        // shows it as a diff rather than as subtle behavioural drift.
        const viaConstant = markupOf(shellAround(routerAt('/'), ExoOutlet));
        const viaFactory = markupOf(shellAround(routerAt('/'), exoOutlet('div')));

        expect(viaConstant).toBe(viaFactory);
    });

    it('carries the static attributes exoOutlet was given', () => {
        const MAIN = exoOutlet('main', { class: 'page', role: 'main' });

        expect(markupOf(shellAround(routerAt('/about'), MAIN))).toBe(
            '<div class="shell"><main class="page" role="main">' +
                '<p class="about">about at /about</p></main></div>'
        );
    });

    it('swaps what it shows when the router navigates, without replacing the boundary element', () => {
        const router = routerAt('/');
        const parent = host();
        EXO_BACKEND.render(shellAround(router, ExoOutlet) as never, parent);

        // `.shell > div`, NOT `div > div`: `host()` hands back a `<div>`, so the shell — itself a
        // `<div>` — matches `div > div` first and the selector returns the WRAPPER instead of the
        // boundary. That failure reads as the outlet emitting an extra element and is really the
        // test looking one level too high.
        const boundary = parent.querySelector('.shell > div') as HTMLElement;
        expect(boundary.innerHTML).toBe(HOME_MARKUP);

        void router.navigate('/about');

        // THE SAME ELEMENT, holding different children. The boundary is the fixed point of a
        // route change; if it were replaced, everything a layout put around it — scroll
        // position, a CSS transition, an intersection observer — would go with it.
        expect(parent.querySelector('.shell > div')).toBe(boundary);
        expect(boundary.innerHTML).toBe('<p class="about">about at /about</p>');

        router.dispose();
    });
});
