// @vitest-environment jsdom
//
// THE ANCHOR — and mostly, the clicks it does NOT take.
//
// A link that intercepted every click would be a button wearing an `<a>`, and the difference shows
// up as things a user cannot work around: ⌘-click stops opening a tab, the middle button stops
// working, "open in new window" goes somewhere else, a download navigates instead of saving.
//
// The href is the other half: it is in the MARKUP, which is what a crawler follows, what the
// browser shows on hover, and what still works while the bundle is downloading.
import { createExoMachine, createExoSchema, wireExoNode } from '@exodra/core';
import type { TExoChildrenPort, TExoMachine, TExoMachineNode, TExoNode } from '@exodra/core';
import { ExoStrBackend } from '@exodra/string';
import { describe, expect, it } from 'vitest';

import { detachedHost } from '@exodra/test-utils';
import { createExoMemoryHistory } from '../../history/createExoMemoryHistory';
import { createExoRouter } from '../../setup/createExoRouter';
import { ExoLink } from '../exoLink';
import { provideExoRouter } from '../../setup/provideExoRouter';
import { shouldIgnoreExoLinkClick } from '../shouldIgnoreExoLinkClick';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoLinkParams, TExoRoute, TExoRouter } from '../../types';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

interface TPlacingNode extends TExoMachineNode {
    createExoNode<TParams>(machine: TExoMachine<never, unknown, TParams>): TExoNode;
    appendChild(port: TExoChildrenPort, node: TExoNode): TExoNode;
}

const page = (name: string) =>
    createExoMachine(
        createExoSchema((b) => {
            b.el('p', { class: name }, (p) => {
                p.text(name);
            });
            return {};
        })
    );

const ROUTES: readonly TExoRoute[] = [
    { path: '/', component: page('home') },
    { path: '/about', component: page('about') },
    { path: '/about/team', component: page('team') },
];

const NAV_SCHEMA = createExoSchema((b) => {
    let items!: TExoChildrenPort;
    b.el('nav', null, (n) => {
        items = n.childrenPort();
    });
    return { items };
});

const navWith = (router: TExoRouter | null, links: readonly TExoLinkParams[]) => {
    const m = createExoMachine<TPlacingNode>(NAV_SCHEMA, {
        createInitialState: (c) => {
            if (router !== null) provideExoRouter(c, router);
            for (let i = 0; i < links.length; i++) {
                c.appendChild(
                    NAV_SCHEMA.ports.items,
                    wireExoNode(c.createExoNode(ExoLink), links[i])
                );
            }
        },
    });
    return m as never;
};

const settled = (): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

const mount = (links: readonly TExoLinkParams[], options?: { base?: string; at?: string }) => {
    const router = createExoRouter(ROUTES, {
        history: createExoMemoryHistory({
            initialPath: options?.at ?? '/',
            basePath: options?.base,
        }),
    });
    const parent = detachedHost();
    EXO_BACKEND.render(navWith(router, links), parent);
    return { router, parent };
};

const clickOn = (anchor: Element, init: MouseEventInit = {}): MouseEvent => {
    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        ...init,
    });
    anchor.dispatchEvent(event);
    return event;
};

describe('ExoLink — what it puts in the markup', () => {
    it('writes a real href, one anchor per entry, in the order they were placed', () => {
        const { parent } = mount([
            { to: '/', label: 'Home' },
            { to: '/about', label: 'About' },
        ]);
        expect(parent.innerHTML).toBe('<nav><a href="/">Home</a><a href="/about">About</a></nav>');
    });

    it('leaves target and download OUT when they were not given', () => {
        // An absent value REMOVES the attribute, so an optional attribute costs a port slot and no
        // bytes — which is the only reason these two can be offered here instead of forcing a
        // hand-written anchor.
        const { parent } = mount([{ to: '/about', label: 'About' }]);
        const anchor = parent.querySelector('a') as HTMLAnchorElement;
        expect(anchor.hasAttribute('target')).toBe(false);
        expect(anchor.hasAttribute('download')).toBe(false);
    });

    it("resolves the href through the history's base path, and keeps `to` as written", async () => {
        const { router, parent } = mount([{ to: '/about', label: 'About' }], {
            base: '/app',
        });
        expect((parent.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe(
            '/app/about'
        );

        clickOn(parent.querySelector('a') as Element);
        await settled();
        // The table, the guards and `navigate` all keep talking about the unprefixed path.
        expect(router.getLocation().pathname).toBe('/about');
    });
});

describe('ExoLink — the clicks it takes', () => {
    it('navigates on a plain left click, and prevents the browser default', async () => {
        const { router, parent } = mount([{ to: '/about', label: 'About' }]);
        const event = clickOn(parent.querySelector('a') as Element);

        expect(event.defaultPrevented).toBe(true);
        await settled();
        expect(router.getLocation().pathname).toBe('/about');
    });

    it('replaces the entry when the params say so', async () => {
        const { router, parent } = mount([
            { to: '/about', label: 'About', replace: true, state: { from: 'nav' } },
        ]);
        clickOn(parent.querySelector('a') as Element);
        await settled();

        expect(router.getLocation().pathname).toBe('/about');
        expect(router.getLocation().state).toEqual({ from: 'nav' });
    });
});

describe('ExoLink — the clicks it leaves to the browser', () => {
    const CLICKS_LEFT_ALONE: readonly {
        what: string;
        params: TExoLinkParams;
        init?: MouseEventInit;
    }[] = [
        { what: 'a middle click', params: { to: '/about' }, init: { button: 1 } },
        { what: 'a ⌘ click', params: { to: '/about' }, init: { metaKey: true } },
        { what: 'a Ctrl click', params: { to: '/about' }, init: { ctrlKey: true } },
        { what: 'a Shift click', params: { to: '/about' }, init: { shiftKey: true } },
        { what: 'an Alt click', params: { to: '/about' }, init: { altKey: true } },
        {
            what: 'a link with a target other than _self',
            params: { to: '/about', target: '_blank' },
        },
        {
            what: 'a download link, INCLUDING one with an empty download attribute',
            params: { to: '/about', download: '' },
        },
        { what: 'another origin', params: { to: 'https://example.com/about' } },
    ];

    for (const c of CLICKS_LEFT_ALONE) {
        it(c.what, async () => {
            const { router, parent } = mount([c.params]);
            const event = clickOn(parent.querySelector('a') as Element, c.init ?? {});
            await settled();
            expect(event.defaultPrevented).toBe(false);
            expect(router.getLocation().pathname).toBe('/');
        });
    }

    it("a click the params' own handler already called off", async () => {
        const { router, parent } = mount([
            {
                to: '/about',
                label: 'About',
                onClick: (event) => {
                    event.preventDefault();
                },
            },
        ]);
        clickOn(parent.querySelector('a') as Element);
        await settled();
        expect(router.getLocation().pathname).toBe('/');
    });

    it("but still runs the params' handler on a click it DOES take", async () => {
        const seen: string[] = [];
        const { router, parent } = mount([
            {
                to: '/about',
                label: 'About',
                onClick: () => {
                    seen.push('handler');
                },
            },
        ]);
        clickOn(parent.querySelector('a') as Element);
        await settled();
        expect(seen).toEqual(['handler']);
        expect(router.getLocation().pathname).toBe('/about');
    });
});

describe('shouldIgnoreExoLinkClick — the same policy, asked directly', () => {
    // EXPORTED FOR A HAND-WRITTEN ANCHOR. The cases above assert the policy THROUGH the component,
    // which cannot distinguish "the policy said leave it alone" from "the component never asked";
    // these ask the function directly, which is the form a caller outside this package gets.
    const click = (init: MouseEventInit = {}): MouseEvent =>
        new MouseEvent('click', { button: 0, cancelable: true, ...init });

    it('takes a plain left click on an internal href', () => {
        expect(shouldIgnoreExoLinkClick(click(), '/about')).toBe(false);
    });

    it('leaves every modified click and every non-primary button alone', () => {
        expect(shouldIgnoreExoLinkClick(click({ button: 1 }), '/about')).toBe(true);
        expect(shouldIgnoreExoLinkClick(click({ button: 2 }), '/about')).toBe(true);
        expect(shouldIgnoreExoLinkClick(click({ metaKey: true }), '/about')).toBe(true);
        expect(shouldIgnoreExoLinkClick(click({ ctrlKey: true }), '/about')).toBe(true);
        expect(shouldIgnoreExoLinkClick(click({ shiftKey: true }), '/about')).toBe(true);
        expect(shouldIgnoreExoLinkClick(click({ altKey: true }), '/about')).toBe(true);
    });

    it('leaves a click something upstream already called off', () => {
        const event = click();
        event.preventDefault();
        expect(shouldIgnoreExoLinkClick(event, '/about')).toBe(true);
    });

    it('reads `download` by PRESENCE, so the empty string still means "save this"', () => {
        // `download=""` is the ordinary spelling of "download under the server's filename", and a
        // truthiness test would have let the router swallow it.
        expect(shouldIgnoreExoLinkClick(click(), '/file.pdf', undefined, '')).toBe(true);
        expect(shouldIgnoreExoLinkClick(click(), '/file.pdf', undefined, 'report.pdf')).toBe(true);
        expect(shouldIgnoreExoLinkClick(click(), '/file.pdf', undefined, undefined)).toBe(false);
    });

    it('reads `target` the other way round — `_self` is the one that is still ours', () => {
        expect(shouldIgnoreExoLinkClick(click(), '/about', '_self')).toBe(false);
        expect(shouldIgnoreExoLinkClick(click(), '/about', '')).toBe(false);
        expect(shouldIgnoreExoLinkClick(click(), '/about', '_blank')).toBe(true);
        expect(shouldIgnoreExoLinkClick(click(), '/about', 'aFrame')).toBe(true);
    });

    it('judges the ORIGIN off the resolved href, and same-origin absolutes stay ours', () => {
        // The one test that has to ask the environment. Under jsdom `window.location.origin` is
        // a real origin, so an absolute URL naming it is internal — which is what makes a link
        // written as a full canonical URL still a client-side navigation.
        const here = window.location.origin;
        expect(shouldIgnoreExoLinkClick(click(), `${here}/about`)).toBe(false);
        expect(shouldIgnoreExoLinkClick(click(), 'https://example.com/about')).toBe(true);
        // A scheme with no origin to compare against is somebody else's business either way.
        expect(shouldIgnoreExoLinkClick(click(), 'mailto:a@example.com')).toBe(true);
    });
});

describe('ExoLink — without a router above it', () => {
    it('names the missing provideExoRouter instead of failing later', () => {
        expect(() =>
            EXO_BACKEND.render(navWith(null, [{ to: '/about', label: 'About' }]), detachedHost())
        ).toThrow(/provideExoRouter/);
    });
});

describe('ExoLink — on the server', () => {
    it('prints the same anchor the browser draws', () => {
        const router = createExoRouter(ROUTES, { history: createExoMemoryHistory('/about') });
        expect(
            new ExoStrBackend().render(
                navWith(router, [{ to: '/about', label: 'About', currentWhen: 'exact' }])
            )
        ).toBe('<nav><a href="/about" aria-current="page">About</a></nav>');
    });
});

describe('ExoLink — currentWhen', () => {
    const currentOf = (parent: HTMLElement): (string | null)[] =>
        Array.from(parent.querySelectorAll('a')).map((a) => a.getAttribute('aria-current'));

    it('marks only the exact match with `exact`, and the whole subtree with `prefix`', () => {
        const { parent } = mount(
            [
                { to: '/about', label: 'exact', currentWhen: 'exact' },
                { to: '/about', label: 'prefix', currentWhen: 'prefix' },
                { to: '/', label: 'root', currentWhen: 'prefix' },
                { to: '/about', label: 'plain' },
            ],
            { at: '/about/team' }
        );
        expect(currentOf(parent)).toEqual([null, 'page', 'page', null]);
    });

    it('follows navigation', async () => {
        const { router, parent } = mount([
            { to: '/', label: 'home', currentWhen: 'exact' },
            { to: '/about', label: 'about', currentWhen: 'exact' },
        ]);
        expect(currentOf(parent)).toEqual(['page', null]);

        await router.navigate('/about');
        expect(currentOf(parent)).toEqual([null, 'page']);
    });
    it('starts and stops following navigation when a re-wire adds or drops currentWhen', async () => {
        const router = createExoRouter(ROUTES, { history: createExoMemoryHistory('/') });
        const parent = detachedHost();
        let link!: TExoNode;
        const host = createExoMachine<TPlacingNode>(NAV_SCHEMA, {
            createInitialState: (c) => {
                provideExoRouter(c, router);
                link = wireExoNode(c.createExoNode(ExoLink), { to: '/about', label: 'about' });
                c.appendChild(NAV_SCHEMA.ports.items, link);
            },
        });
        EXO_BACKEND.render(host as never, parent);
        wireExoNode(link, { to: '/about', label: 'about', currentWhen: 'exact' });
        await router.navigate('/about');
        expect(currentOf(parent)).toEqual(['page']);

        wireExoNode(link, { to: '/about', label: 'about' });
        expect(currentOf(parent)).toEqual([null]);
        await router.navigate('/');
        await router.navigate('/about');
        expect(currentOf(parent)).toEqual([null]);
    });
});
