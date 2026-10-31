// @vitest-environment jsdom
//
// THE ASSERTIONS ARE NODE IDENTITY WHEREVER THEY CAN BE. Two identical trees compare equal as
// strings, so "we rebuilt the page and it happened to look the same" passes every markup assertion
// and is exactly what a kept page exists to avoid: every listener on a different element, and
// anything the user had typed or focused gone.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoChildrenPort,
    TExoEventPort,
    TExoMachine,
    TExoMachineNode,
    TExoTextPort,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { createExoMemoryHistory } from '../../history/createExoMemoryHistory';
import { createExoRouter } from '../createExoRouter';
import { exoOutlet } from '../../components/exoOutlet';
import { provideExoRouter } from '../provideExoRouter';
import type { TExoRoute, TExoRouteMatch, TExoRouter } from '../../types';
import { host, source } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

interface TNestingNode extends TExoMachineNode {
    one(port: TExoChildrenPort, machine: TExoMachine<never>): void;
}

let clicked = '';

const HOME_SCHEMA = createExoSchema((b) => {
    let title!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('section', { class: 'home' }, (s) => {
        click = s.eventPort('click');
        s.el('h1', null, (h) => {
            title = h.textPort();
        });
    });
    return { title, click };
});
const mHome = createExoMachineBuilder<TExoMachineNode, TExoRouteMatch>(HOME_SCHEMA);
mHome.on(HOME_SCHEMA.ports.click, () => {
    clicked = 'home';
});
mHome.wire((c, match) => {
    c.text(HOME_SCHEMA.ports.title, 'home at ' + match.pathname);
});
const HOME = mHome.done();

const ABOUT_SCHEMA = createExoSchema((b) => {
    let body!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('article', { class: 'about' }, (a) => {
        click = a.eventPort('click');
        a.el('p', null, (p) => {
            body = p.textPort();
        });
    });
    return { body, click };
});
const mAbout = createExoMachineBuilder<TExoMachineNode, TExoRouteMatch>(ABOUT_SCHEMA);
mAbout.on(ABOUT_SCHEMA.ports.click, () => {
    clicked = 'about';
});
mAbout.wire((c, match) => {
    c.text(ABOUT_SCHEMA.ports.body, 'about ' + match.params.topic);
});
const ABOUT = mAbout.done();

const WATCHED = source('alive');
const WATCHED_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('aside', { class: 'watched' }, (s) => {
        text = s.textPort();
    });
    return { text };
});
const mWatched = createExoMachineBuilder<TExoMachineNode>(WATCHED_SCHEMA);
mWatched.effect((c) => {
    c.text(WATCHED_SCHEMA.ports.text, String(WATCHED.getValue()));
    return WATCHED.onChange(() => c.text(WATCHED_SCHEMA.ports.text, String(WATCHED.getValue())));
});
const WATCHED_PAGE = mWatched.done();

const ROUTES: readonly TExoRoute[] = [
    { path: '/', component: HOME },
    { path: '/about/:topic', component: ABOUT },
    { path: '/watched', component: WATCHED_PAGE },
];

const OUTLET = exoOutlet('main');

const shellFor = (router: TExoRouter) => {
    const schema = createExoSchema((b) => {
        let body!: TExoChildrenPort;
        b.el('div', { class: 'shell' }, (d) => {
            body = d.childrenPort();
        });
        return { body };
    });
    const m = createExoMachineBuilder<TNestingNode>(schema);
    m.createInitialState((c) => {
        provideExoRouter(c, router);
        c.one(schema.ports.body, OUTLET);
    });
    return m.done() as never;
};

const routerAt = (path: string): TExoRouter =>
    createExoRouter(ROUTES, { history: createExoMemoryHistory(path) });

const HOME_SHELL =
    '<div class="shell"><main><section class="home"><h1>home at /</h1></section></main></div>';
const ABOUT_SHELL =
    '<div class="shell"><main><article class="about"><p>about exodra</p></article></main></div>';

describe('a routed page: rendered, navigated, disposed', () => {
    it('draws the matched page inside the boundary, and the param it read', () => {
        const home = host();
        EXO_BACKEND.render(shellFor(routerAt('/')), home);
        expect(home.innerHTML).toBe(HOME_SHELL);

        const about = host();
        EXO_BACKEND.render(shellFor(routerAt('/about/exodra')), about);
        expect(about.innerHTML).toBe(ABOUT_SHELL);
    });

    it('SWAPS the page on navigation, and wires the new one', () => {
        const router = routerAt('/');
        const parent = host();
        EXO_BACKEND.render(shellFor(router), parent);
        const boundary = parent.querySelector('main') as HTMLElement;

        return router.navigate('/about/exodra').then(() => {
            expect(parent.innerHTML).toBe(ABOUT_SHELL);
            // The boundary itself was never rebuilt — only what stands inside it.
            expect(parent.querySelector('main')).toBe(boundary);

            clicked = '';
            (parent.querySelector('article') as HTMLElement).dispatchEvent(
                new MouseEvent('click', { bubbles: true })
            );
            expect(clicked).toBe('about');
        });
    });

    it('navigates BACK to the first route, and the page is built fresh and wired', () => {
        const router = routerAt('/');
        const parent = host();
        EXO_BACKEND.render(shellFor(router), parent);

        return router
            .navigate('/about/exodra')
            .then(() => router.navigate('/'))
            .then(() => {
                expect(parent.innerHTML).toBe(HOME_SHELL);
                clicked = '';
                (parent.querySelector('section') as HTMLElement).dispatchEvent(
                    new MouseEvent('click', { bubbles: true })
                );
                expect(clicked).toBe('home');
            });
    });

    it('DISPOSES the outgoing page — its subscriptions end when it leaves', () => {
        // `remove` and not `detach`, which is what runs the page's teardown. Miss it and every
        // route a user has ever visited keeps its bindings alive, holding the detached elements
        // they write to — a leak nothing reports until the application has been used a while.
        //
        // THE SUBSCRIBER COUNT AND NOT THE LISTENER. A direct event listener is owned by its
        // element and dies with it, so a page's handler still answers a click dispatched at the
        // detached element — which makes a listener the one thing disposal does not observe.
        const router = routerAt('/watched');
        const parent = host();
        EXO_BACKEND.render(shellFor(router), parent);
        expect(WATCHED.subscribers()).toBe(1);

        return router.navigate('/').then(() => {
            expect(parent.querySelector('aside.watched')).toBe(null);
            expect(WATCHED.subscribers()).toBe(0);
        });
    });

    it('KEEPS the page when the location changes but the path does not', () => {
        const router = routerAt('/');
        const parent = host();
        EXO_BACKEND.render(shellFor(router), parent);
        const page = parent.querySelector('section.home');

        return router.setQuery({ tab: 'two' }).then(() => {
            expect(router.getLocation().search).toBe('?tab=two');
            expect(parent.querySelector('section.home')).toBe(page);
        });
    });

    it('RE-WIRES the same page when a param changes under the same route', () => {
        const router = routerAt('/about/one');
        const parent = host();
        EXO_BACKEND.render(shellFor(router), parent);
        const first = parent.querySelector('article');

        return router.navigate('/about/two').then(() => {
            expect(parent.querySelector('article')).toBe(first);
            expect((parent.querySelector('p') as HTMLElement).textContent).toBe('about two');
        });
    });

    it('shows NOTHING for a path no route matches, and fills the boundary when one does', () => {
        // An unmatched branch is an EMPTY region — no marker and no placeholder node, so there is
        // nothing in the boundary standing for a page that is not there.
        const router = routerAt('/nowhere');
        const parent = host();
        EXO_BACKEND.render(shellFor(router), parent);
        expect(parent.innerHTML).toBe('<div class="shell"><main></main></div>');

        return router.navigate('/').then(() => {
            expect(parent.innerHTML).toBe(HOME_SHELL);
        });
    });

    it("ends the boundary's subscription when the render is disposed", () => {
        const router = routerAt('/');
        const parent = host();
        const dispose = EXO_BACKEND.render(shellFor(router), parent);

        let notified = 0;
        router.onChange(() => {
            notified++;
        });
        dispose();

        return router.navigate('/about/exodra').then(() => {
            // The router still works — it is an application object, not the render's.
            expect(notified).toBe(1);
            // The torn-down page did not follow it.
            expect(parent.querySelector('article')).toBe(null);
        });
    });
});
