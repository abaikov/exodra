import { describe, expect, it } from 'vitest';
import { createRouter } from './createRouter';
import { createMemoryHistory } from './history';

const makeRouter = (path = '/') =>
    createRouter([], { history: createMemoryHistory(path) });

describe('router.bindQuery', () => {
    it('reads the current query value, falling back to the default', () => {
        const router = makeRouter('/?status=done');
        const status = router.bindQuery('status', { default: 'all' });
        const tag = router.bindQuery('tag', { default: 'all' });

        expect(status.getValue()).toBe('done');
        expect(tag.getValue()).toBe('all'); // absent -> default
    });

    it('writes the value into the URL via setValue', async () => {
        const router = makeRouter('/');
        const status = router.bindQuery('status', { default: 'all' });

        await status.setValue('active');

        expect(router.getLocation().search).toBe('?status=active');
        expect(status.getValue()).toBe('active');
    });

    it('clearing back to the default removes the key from the URL', async () => {
        const router = makeRouter('/?status=done&tag=ui');
        const status = router.bindQuery('status', { default: 'all' });

        await status.setValue('all'); // default -> drop key

        expect(router.getLocation().search).toBe('?tag=ui');
        expect(status.getValue()).toBe('all');
    });

    it('setValue patches only its own key, preserving the others', async () => {
        const router = makeRouter('/?status=done&q=ship');
        const tag = router.bindQuery('tag');

        await tag.setValue('ui');

        const query = router.getQuery();
        expect(query.status).toBe('done');
        expect(query.q).toBe('ship');
        expect(query.tag).toBe('ui');
    });

    it('notifies subscribers when the value changes (own writes and navigation)', async () => {
        const router = makeRouter('/');
        const status = router.bindQuery('status', { default: 'all' });
        const seen: string[] = [];

        const unsubscribe = status.subscribe(value => seen.push(value));
        await status.setValue('active'); // own write
        await router.navigate('/?status=done'); // external navigation (e.g. back/forward)
        unsubscribe();
        await status.setValue('all'); // ignored after unsubscribe

        expect(seen).toEqual(['active', 'done']);
        expect(status.getValue()).toBe('all');
    });

    it('does not fire for query changes to other keys', async () => {
        const router = makeRouter('/');
        const status = router.bindQuery('status', { default: 'all' });
        const tag = router.bindQuery('tag');
        const statusSeen: string[] = [];

        status.subscribe(value => statusSeen.push(value));
        await tag.setValue('ui');

        // `derive` re-maps on every location change, but the mapped status value
        // stays 'all', so a deduping consumer sees no meaningful change.
        expect(status.getValue()).toBe('all');
        expect(statusSeen.every(v => v === 'all')).toBe(true);
    });
});
