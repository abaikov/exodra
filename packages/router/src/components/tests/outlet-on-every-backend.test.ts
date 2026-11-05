// @vitest-environment jsdom
import { createExoMachine, composeExoMachine, withExoWire, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachine, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { ExoStrBackend } from '@exodra/string';
import { ExoDomBackend, withExoCompiler, withExoHydration } from '@exodra/dom';
import { describe, expect, it } from 'vitest';
import { exoOutlet } from '../exoOutlet';
import { createExoMemoryHistory } from '../../history/createExoMemoryHistory';
import { createExoRouter } from '../../setup/createExoRouter';
import { provideExoRouter } from '../../setup/provideExoRouter';
import type { TExoRouteMatch } from '../../types';

interface TNestingNode extends TExoMachineNode {
    one(port: TExoChildrenPort, machine: TExoMachine<never>): void;
}

const USER_SCHEMA = createExoSchema((b) => {
    let title!: TExoTextPort;
    b.el('h1', null, (h1) => {
        title = h1.textPort();
    });
    return { title };
});
const mUser = createExoMachine<TExoMachineNode, TExoRouteMatch>(USER_SCHEMA);
const USER = composeExoMachine(mUser, (m) =>
    withExoWire(m, (c, match) => {
        c.text(USER_SCHEMA.ports.title, 'user ' + match.params.id);
    })
);

const PAGE_OUTLET = exoOutlet('div');

const LAYOUT_SCHEMA = createExoSchema((b) => {
    let page!: TExoChildrenPort;
    b.el('section', null, (section) => {
        section.text('layout');
        page = section.childrenPort();
    });
    return { page };
});
const mLayout = createExoMachine<TNestingNode>(LAYOUT_SCHEMA, {
    createInitialState: (c) => {
        c.one(LAYOUT_SCHEMA.ports.page, PAGE_OUTLET);
    },
});
const LAYOUT = mLayout;

const appAt = (path: string) => {
    const router = createExoRouter(
        [{ path: '/users', component: LAYOUT, children: [{ path: ':id', component: USER }] }],
        { history: createExoMemoryHistory(path) }
    );
    const APP_SCHEMA = createExoSchema((b) => {
        let outlet!: TExoChildrenPort;
        b.el('main', null, (main) => {
            outlet = main.childrenPort();
        });
        return { outlet };
    });
    const app = createExoMachine<TNestingNode>(APP_SCHEMA, {
        createInitialState: (c) => {
            provideExoRouter(c, router);
            c.one(APP_SCHEMA.ports.outlet, PAGE_OUTLET);
        },
    });
    return { app, router };
};

const NESTED = '<main><div><section>layout<div><h1>user 7</h1></div></section></div></main>';

describe('a nested route boundary on every backend', () => {
    it('prints the layout and the page inside it on the server', () => {
        expect(new ExoStrBackend().render(appAt('/users/7').app as never)).toBe(NESTED);
    });

    it('renders the same tree on the client', () => {
        const parent = document.createElement('div');
        withExoCompiler(new ExoDomBackend()).render(appAt('/users/7').app as never, parent);
        expect(parent.innerHTML).toBe(NESTED);
    });

    it('hydrates the server markup by identity, and re-wires the same page on a param change', async () => {
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        parent.innerHTML = new ExoStrBackend().render(appAt('/users/7').app as never);
        const servedHeading = parent.querySelector('h1');
        const { app, router } = appAt('/users/7');

        withExoHydration(withExoCompiler(new ExoDomBackend())).hydrate(app as never, parent);
        expect(parent.innerHTML).toBe(NESTED);
        expect(parent.querySelector('h1')).toBe(servedHeading);

        await router.navigate('/users/9');
        expect(parent.querySelector('h1')?.textContent).toBe('user 9');
        expect(parent.querySelector('h1')).toBe(servedHeading);
        parent.remove();
    });
});
