// @vitest-environment jsdom
import {
    connectExoNode,
    createExoMachine,
    composeExoMachine,
    withExoWire,
    withExoEffects,
    createExoSchema,
    disconnectExoNode,
} from '@exodra/core';
import type {
    TExoChildrenPort,
    TExoMachine,
    TExoMachineNode,
    TExoNode,
    TExoTextPort,
} from '@exodra/core';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import { host } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import { ExoOutlet } from '../exoOutlet';
import { createExoMemoryHistory } from '../../history/createExoMemoryHistory';
import { createExoRouter } from '../../setup/createExoRouter';
import { injectExoRouter } from '../../setup/injectExoRouter';
import { provideExoRouter } from '../../setup/provideExoRouter';
import { exoLazy } from '../../pages/exoLazy';
import type { TExoOutletState, TExoRoute, TExoRouteMatch, TExoRouter } from '../../types';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

interface TNestingNode extends TExoMachineNode {
    one(port: TExoChildrenPort, machine: TExoMachine<never>): void;
    build(machine: TExoMachine<never>): TExoNode;
    childList(port: TExoChildrenPort): { insert(child: TExoNode): void };
}

const log: string[] = [];

const wiredPage = (name: string) => {
    const schema = createExoSchema((b) => {
        let label!: TExoTextPort;
        b.el('p', { class: name }, (p) => {
            label = p.textPort();
        });
        return { label };
    });
    const m = createExoMachine<TExoMachineNode, TExoRouteMatch>(schema, {
        createInitialState: () => {
            log.push('build ' + name);
        },
    });
    return composeExoMachine(m, (m) =>
        withExoWire(m, (c, match) => {
            log.push('wire ' + name);
            c.text(schema.ports.label, name + ' ' + (match.params.id ?? ''));
        })
    );
};

const plainPage = (name: string) => {
    const schema = createExoSchema((b) => {
        let label!: TExoTextPort;
        b.el('p', { class: name }, (p) => {
            label = p.textPort();
        });
        return { label };
    });
    const m = createExoMachine<TExoMachineNode, TExoRouteMatch>(schema, {
        createInitialState: (c, match) => {
            log.push('build ' + name);
            c.text(schema.ports.label, name + ' ' + (match.params.id ?? ''));
        },
    });
    return m;
};

const layout = (name: string) => {
    const schema = createExoSchema((b) => {
        let page!: TExoChildrenPort;
        b.el('section', { class: name }, (s) => {
            page = s.childrenPort();
        });
        return { page };
    });
    const m = createExoMachine<TNestingNode>(schema, {
        createInitialState: (c) => {
            log.push('build ' + name);
            c.one(schema.ports.page, ExoOutlet);
        },
    });
    return m;
};

const shellFor = (router: TExoRouter, held: TExoNode[]) => {
    const schema = createExoSchema((b) => {
        let body!: TExoChildrenPort;
        b.el('main', null, (m) => {
            body = m.childrenPort();
        });
        return { body };
    });
    const m = createExoMachine<TNestingNode>(schema, {
        createInitialState: (c) => {
            provideExoRouter(c, router);
            const outlet = c.build(ExoOutlet);
            held.push(outlet);
            c.childList(schema.ports.body).insert(outlet);
        },
    });
    return m;
};

const mount = (routes: readonly TExoRoute[], at: string) => {
    const router = createExoRouter(routes, { history: createExoMemoryHistory(at) });
    const parent = host();
    const held: TExoNode[] = [];
    const dispose = EXO_BACKEND.render(shellFor(router, held) as never, parent);
    log.length = 0;
    return { router, parent, dispose, outlet: held[0] };
};

describe('nested route boundaries', () => {
    it('builds the arriving page ONCE, inside the arriving layout, on a cross-layout navigation', async () => {
        const { router, parent } = mount(
            [
                {
                    path: '/a',
                    component: layout('la'),
                    children: [{ path: ':id', component: wiredPage('pa') }],
                },
                {
                    path: '/b',
                    component: layout('lb'),
                    children: [{ path: ':id', component: wiredPage('pb') }],
                },
            ],
            '/a/1'
        );

        await router.navigate('/b/2');

        expect(log).toEqual(['build lb', 'build pb', 'wire pb']);
        expect(parent.querySelector('section.lb p.pb')?.textContent).toBe('pb 2');
        expect(parent.querySelector('section.la')).toBe(null);
    });

    it("lets a nested boundary leave its parent's list when its layout is torn down", async () => {
        const { router, outlet } = mount(
            [
                {
                    path: '/a',
                    component: layout('la'),
                    children: [{ path: ':id', component: wiredPage('pa') }],
                },
                {
                    path: '/b',
                    component: layout('lb'),
                    children: [{ path: ':id', component: wiredPage('pb') }],
                },
            ],
            '/a/1'
        );
        const state = (outlet as unknown as { state: TExoOutletState }).state;

        await router.navigate('/b/2');
        await router.navigate('/a/3');
        await router.navigate('/b/4');

        expect(state.nestedOutletStates).toHaveLength(1);
        expect(state.nestedOutletStates[0].depth).toBe(1);
    });

    it('keeps the layout and RE-WIRES the page with a wire when only a param moved', async () => {
        const { router, parent } = mount(
            [
                {
                    path: '/users',
                    component: layout('users'),
                    children: [{ path: ':id', component: wiredPage('user') }],
                },
            ],
            '/users/1'
        );
        const section = parent.querySelector('section.users');
        const paragraph = parent.querySelector('p.user');

        await router.navigate('/users/2');

        expect(log).toEqual(['wire user']);
        expect(parent.querySelector('section.users')).toBe(section);
        expect(parent.querySelector('p.user')).toBe(paragraph);
        expect(paragraph?.textContent).toBe('user 2');
    });

    it('REBUILDS a page without a wire, which cannot observe the param', async () => {
        const { router, parent } = mount(
            [
                {
                    path: '/users',
                    component: layout('users'),
                    children: [{ path: ':id', component: plainPage('user') }],
                },
            ],
            '/users/1'
        );
        const paragraph = parent.querySelector('p.user');

        await router.navigate('/users/2');

        expect(log).toEqual(['build user']);
        expect(parent.querySelector('p.user')).not.toBe(paragraph);
        expect(parent.querySelector('p.user')?.textContent).toBe('user 2');
    });

    it('draws an index child inside its layout', () => {
        const { parent } = mount(
            [
                {
                    path: '/admin',
                    component: layout('admin'),
                    children: [{ path: '', component: wiredPage('dashboard') }],
                },
            ],
            '/admin'
        );

        expect(parent.querySelector('section.admin p.dashboard')).not.toBe(null);
    });

    it('does not notify a router subscriber that lived in the page being removed', async () => {
        const heard: string[] = [];
        const schema = createExoSchema((b) => {
            b.el('p', { class: 'listening' });
            return {};
        });
        const Page = withExoEffects(createExoMachine<TExoMachineNode>(schema), (effect) => {
            effect((c) => injectExoRouter(c).onChange(() => heard.push('old page')));
        });
        const { router } = mount(
            [
                { path: '/', component: Page },
                { path: '/next', component: wiredPage('next') },
            ],
            '/'
        );

        await router.navigate('/next');

        expect(heard).toEqual([]);
    });

    it('first calls a subscriber the arriving page added on the NEXT change, not the one that built it', async () => {
        const heard: string[] = [];
        const schema = createExoSchema((b) => {
            b.el('p', { class: 'arriving' });
            return {};
        });
        const Page = withExoEffects(createExoMachine<TExoMachineNode>(schema), (effect) => {
            effect((c) => {
                const router = injectExoRouter(c);
                return router.onChange(() => heard.push(router.getLocation().search));
            });
        });
        const { router } = mount(
            [
                { path: '/', component: wiredPage('home') },
                { path: '/arriving', component: Page },
            ],
            '/'
        );

        await router.navigate('/arriving');
        expect(heard).toEqual([]);

        await router.setQuery({ tab: 'two' });
        expect(heard).toEqual(['?tab=two']);
    });

    it('leaves a DISCONNECTED boundary alone and catches it up on reconnect', async () => {
        const { router, parent, outlet } = mount(
            [
                { path: '/', component: wiredPage('home') },
                { path: '/about', component: wiredPage('about') },
            ],
            '/'
        );

        disconnectExoNode(outlet);
        await router.navigate('/about');
        expect(parent.querySelector('p.home')).not.toBe(null);
        expect(log).toEqual([]);

        connectExoNode(outlet, ExoOutlet);
        expect(parent.querySelector('p.home')).toBe(null);
        expect(parent.querySelector('p.about')).not.toBe(null);
    });

    it('stops following the router once the render is disposed', async () => {
        const { router, parent, dispose } = mount(
            [
                { path: '/', component: wiredPage('home') },
                { path: '/about', component: wiredPage('about') },
            ],
            '/'
        );
        let heard = 0;
        router.onChange(() => heard++);

        dispose();
        await router.navigate('/about');

        expect(heard).toBe(1);
        expect(log).toEqual([]);
        expect(parent.querySelector('p.about')).toBe(null);
    });

    it('empties the boundary while a lazy page loads, then fills it', async () => {
        let release!: () => void;
        const arrived = new Promise<void>((resolve) => {
            release = resolve;
        });
        const later = wiredPage('later');
        const { router, parent } = mount(
            [
                { path: '/', component: wiredPage('home') },
                { path: '/later', component: exoLazy(() => arrived.then(() => later)) },
            ],
            '/'
        );

        await router.navigate('/later');
        expect(parent.querySelector('main > div')?.innerHTML).toBe('');

        release();
        await arrived;
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(parent.querySelector('p.later')).not.toBe(null);
    });
});
