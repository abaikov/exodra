// @vitest-environment jsdom
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoMachine, TExoMachineNode } from '@exodra/core';
import { nextExoId, provideExoIds } from '@exodra/context';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import { host } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import { ExoOutlet } from '../exoOutlet';
import { createExoMemoryHistory } from '../../history/createExoMemoryHistory';
import { createExoRouter } from '../../setup/createExoRouter';
import { provideExoRouter } from '../../setup/provideExoRouter';
import { exoLazy } from '../../pages/exoLazy';
import type { TExoRoute, TExoRouter } from '../../types';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

interface TShellNode extends TExoMachineNode {
    one(port: TExoChildrenPort, machine: TExoMachine<never>): void;
}

const idTaker = (tag: string) => {
    const schema = createExoSchema((b) => {
        let id!: TExoAttrPort;
        b.el(tag, null, (el) => {
            id = el.port('id');
        });
        return { id };
    });
    const m = createExoMachineBuilder<TExoMachineNode>(schema);
    m.createInitialState((c) => {
        c.attr(schema.ports.id, nextExoId(c));
    });
    return m.done();
};

const PAGE = idTaker('article');
const FOOTER = idTaker('footer');

const shellFor = (router: TExoRouter) => {
    const schema = createExoSchema((b) => {
        let outlet!: TExoChildrenPort;
        let footer!: TExoChildrenPort;
        b.el('main', null, (m) => {
            m.el('section', null, (s) => {
                outlet = s.childrenPort();
            });
            m.el('div', null, (d) => {
                footer = d.childrenPort();
            });
        });
        return { outlet, footer };
    });
    const m = createExoMachineBuilder<TShellNode>(schema);
    m.createInitialState((c) => {
        provideExoIds(c, 'app');
        provideExoRouter(c, router);
        c.one(schema.ports.outlet, ExoOutlet as never);
        c.one(schema.ports.footer, FOOTER as never);
    });
    return m.done();
};

const mount = (routes: readonly TExoRoute[], at: string) => {
    const router = createExoRouter(routes, { history: createExoMemoryHistory(at) });
    const parent = host();
    EXO_BACKEND.render(shellFor(router) as never, parent);
    return { router, parent };
};

describe('an outlet forks the id count for its page', () => {
    it('a page counts under the outlet, and what follows the outlet does not move', () => {
        const { parent } = mount([{ path: '/', component: PAGE }], '/');
        expect(parent.querySelector('article')?.id).toBe('app-0-0');
        expect(parent.querySelector('footer')?.id).toBe('app-1');
    });

    it('a lazy page that arrives late takes the ids it would have taken at once', async () => {
        let release!: () => void;
        const arrived = new Promise<void>((resolve) => {
            release = resolve;
        });
        const { parent } = mount(
            [{ path: '/', component: exoLazy(() => arrived.then(() => PAGE)) }],
            '/'
        );
        expect(parent.querySelector('article')).toBeNull();
        expect(parent.querySelector('footer')?.id).toBe('app-1');
        release();
        await arrived;
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(parent.querySelector('article')?.id).toBe('app-0-0');
    });

    it('a page built again after a navigation counts from the start of its fork', async () => {
        const { router, parent } = mount(
            [
                { path: '/', component: PAGE },
                { path: '/other', component: idTaker('aside') },
            ],
            '/'
        );
        await router.navigate('/other');
        expect(parent.querySelector('aside')?.id).toBe('app-0-0');
        await router.navigate('/');
        expect(parent.querySelector('article')?.id).toBe('app-0-0');
    });
});
