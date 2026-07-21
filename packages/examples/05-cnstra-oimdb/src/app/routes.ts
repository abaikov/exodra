import { lazy } from '@exodra/router';
import type { TExoRoute } from '@exodra/router';
import type { TExoSchema } from '@exodra/core';

// Each page is a separate dynamic import → its own vite chunk. The router's
// shared core (this module + runtime + store + cns + @exodra/* + oimdb/cnstra)
// loads once; page chunks load on navigation. `lazy()` returns a zero-arg loader
// the router resolves on match; the page's default export is (match) => schema.
export interface NavItem {
    path: string;
    label: string;
    icon: string;
}

export const NAV: readonly NavItem[] = [
    { path: '/', label: 'Board', icon: '▦' },
    { path: '/tasks', label: 'Tasks', icon: '☰' },
    { path: '/projects', label: 'Projects', icon: '◆' },
    { path: '/people', label: 'People', icon: '☺' },
    { path: '/taxonomy', label: 'Tags & Labels', icon: '#' },
    { path: '/activity', label: 'Activity', icon: '↻' },
    { path: '/virtual', label: 'Virtual (10k)', icon: '≣' },
];

// Each page module default-exports `() => schema` (length 0 — directly callable
// for SSR). The router's isLazyLoader treats a length-0 function as a loader and
// caches its result, which would reuse one schema object across navigations (→
// the "two live positions" throw). So we wrap each into a length-1 route renderer
// `(match) => page()` — not a loader, called fresh on every navigation — while
// keeping the dynamic import() as the chunk boundary.
const page = (
    load: () => Promise<{ default: () => TExoSchema }>
): ReturnType<typeof lazy> =>
    lazy(() =>
        load().then(mod => ({ default: (_match: unknown) => mod.default() }))
    );

export const routes: readonly TExoRoute[] = [
    { path: '/', component: page(() => import('../pages/board')) },
    { path: '/tasks', component: page(() => import('../pages/tasks')) },
    { path: '/projects', component: page(() => import('../pages/projects')) },
    { path: '/people', component: page(() => import('../pages/people')) },
    { path: '/taxonomy', component: page(() => import('../pages/taxonomy')) },
    { path: '/activity', component: page(() => import('../pages/activity')) },
    { path: '/virtual', component: page(() => import('../pages/virtual')) },
];
