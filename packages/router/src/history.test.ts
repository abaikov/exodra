// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createBrowserHistory, createMemoryHistory } from './history';

describe('router history adapters', () => {
    it('navigates with memory history', () => {
        const history = createMemoryHistory('/start');
        const updates: string[] = [];
        history.subscribe(() => updates.push(history.getLocation().href));

        history.push('/next?tab=one');
        history.replace('/final#done');

        expect(history.getLocation().href).toBe('/final#done');
        expect(updates).toEqual(['/next?tab=one', '/final#done']);
    });

    it('navigates with browser history', () => {
        window.history.replaceState(null, '', '/initial');
        const history = createBrowserHistory({ window });
        const updates: string[] = [];
        history.subscribe(() => updates.push(history.getLocation().href));

        history.push('/browser-next');
        history.replace('/browser-final?ok=1');
        window.history.pushState(null, '', '/from-popstate');
        window.dispatchEvent(new PopStateEvent('popstate'));

        expect(history.getLocation().href).toBe('/from-popstate');
        expect(updates).toEqual([
            '/browser-next',
            '/browser-final?ok=1',
            '/from-popstate',
        ]);

        history.dispose?.();
    });
});
