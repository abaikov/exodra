// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createExoBrowserHistory } from '../createExoBrowserHistory';
import { createExoMemoryHistory } from '../createExoMemoryHistory';

describe('router history adapters', () => {
    it('navigates with memory history', () => {
        const history = createExoMemoryHistory('/start');
        const updates: string[] = [];
        history.onChange(() => updates.push(history.getLocation().href));

        history.push('/next?tab=one');
        history.replace('/final#done');

        expect(history.getLocation().href).toBe('/final#done');
        expect(updates).toEqual(['/next?tab=one', '/final#done']);
    });

    it('navigates with browser history', () => {
        window.history.replaceState(null, '', '/initial');
        const history = createExoBrowserHistory({ window });
        const updates: string[] = [];
        history.onChange(() => updates.push(history.getLocation().href));

        history.push('/browser-next');
        history.replace('/browser-final?ok=1');
        window.history.pushState(null, '', '/from-popstate');
        window.dispatchEvent(new PopStateEvent('popstate'));

        expect(history.getLocation().href).toBe('/from-popstate');
        expect(updates).toEqual(['/browser-next', '/browser-final?ok=1', '/from-popstate']);

        history.dispose?.();
    });
});

// ------------------------------------------------------------------------------- basePath
//
// AN APPLICATION SERVED UNDER A PREFIX. `basePath` has two directions to get wrong: everything the
// application says — the route table, the guards, `navigate`, `match.pathname` — is written WITHOUT
// the prefix, and everything the browser sees — the address bar, an `<a href>` — carries it.
// `addBasePath` and `stripBasePath` are those two directions.

describe('a history under a basePath', () => {
    it('strips the prefix off what the application reads, in memory', () => {
        const history = createExoMemoryHistory({ initialPath: '/docs/guide', basePath: '/docs' });

        // The application is at `/guide`. Nothing it matches against ever mentions `/docs`.
        expect(history.getLocation().pathname).toBe('/guide');

        // And it navigates in its own terms.
        history.push('/guide/install?q=1');
        expect(history.getLocation().pathname).toBe('/guide/install');
        expect(history.getLocation().search).toBe('?q=1');
    });

    it('puts the prefix back on the href a browser is given', () => {
        const history = createExoMemoryHistory({ initialPath: '/docs', basePath: '/docs' });

        expect(history.createHref('/guide')).toBe('/docs/guide');
        // THE ROOT OF THE APPLICATION IS THE BASE PATH ITSELF, with no trailing slash appended —
        // `/docs/` and `/docs` are two URLs, and a nav link to `/` that produced the first would
        // disagree with the address bar the server served.
        expect(history.createHref('/')).toBe('/docs');
        // A path that already carries the prefix is NOT protected against being given it twice:
        // `createHref` takes what the application spells, and an application under a base path
        // spells its paths without one.
        expect(history.createHref('/docs/guide')).toBe('/docs/docs/guide');
    });

    it('leaves a path OUTSIDE the base path alone rather than mangling it', () => {
        // `stripBasePath` only strips an exact match or a `basePath/` prefix — so `/docsearch`
        // is not `/docs` + `earch`, which a naive `slice(basePath.length)` would have produced.
        const history = createExoMemoryHistory({ initialPath: '/docsearch', basePath: '/docs' });

        expect(history.getLocation().pathname).toBe('/docsearch');
    });

    it('round-trips through the real History API in the browser adapter', () => {
        window.history.replaceState(null, '', '/app/dashboard');
        const history = createExoBrowserHistory({ window, basePath: '/app' });

        // What the application reads is prefix-free …
        expect(history.getLocation().pathname).toBe('/dashboard');

        // … and what lands in the address bar carries the prefix.
        history.push('/settings');
        expect(window.location.pathname).toBe('/app/settings');
        expect(history.getLocation().pathname).toBe('/settings');

        history.dispose?.();
    });
});
