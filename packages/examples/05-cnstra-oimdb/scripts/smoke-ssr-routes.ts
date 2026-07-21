// Matched-route SSR: EVERY route (not just the board) renders its page HTML on the
// server, and a non-board route hydrates by reusing the SSR nodes.
// Run: npx vite-node scripts/smoke-ssr-routes.ts
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost/people' });
const w = dom.window as unknown as Record<string, unknown>;
for (const k of ['document', 'Element', 'Text', 'Comment', 'Node', 'HTMLElement', 'DocumentFragment', 'Event', 'KeyboardEvent', 'window', 'history', 'location'])
    (globalThis as Record<string, unknown>)[k] = w[k] ?? (globalThis as Record<string, unknown>)[k];
(globalThis as Record<string, unknown>).window = dom.window;

const { render } = await import('../src/entry-server');
const { createSeed } = await import('../src/domain/seed');
const { mountApp } = await import('../src/app/mount-app');

let pass = 0;
const fail: string[] = [];
const ok = (n: string, c: boolean) => {
    if (c) { pass++; console.log('  ✓', n); }
    else { fail.push(n); console.log('  ✗', n); }
};
const tick = () => new Promise(r => setTimeout(r, 80));

console.log('\n── every route SSRs its page (not an empty outlet) ──');
const markers: Record<string, string> = {
    '/': 'page--board',
    '/tasks': 'page--tasks',
    '/projects': 'page--projects',
    '/people': 'page--people',
    '/taxonomy': 'page--taxonomy',
    '/activity': 'page--activity',
    '/virtual': 'vlist',
};
for (const [url, marker] of Object.entries(markers)) {
    const { appHtml } = render(url);
    ok(`${url} → server-rendered page content`, appHtml.includes(marker) && !appHtml.includes('class="outlet"></main>'));
}

console.log('\n── a non-board route hydrates (reuses SSR nodes) ──');
const { appHtml, stateScript } = render('/people');
document.body.innerHTML = `<div id="app">${appHtml}</div>${stateScript}`;
const root = document.getElementById('app') as HTMLElement;
const ssrRow = root.querySelector('#outlet .page--people [data-id]');
ok('SSR rendered a people row', !!ssrRow);
mountApp(root, createSeed());
await tick();
const afterRow = root.querySelector('#outlet .page--people [data-id]');
ok('people page present after hydrate', !!afterRow);
ok('SAME node reused (hydrated, not rebuilt)', !!ssrRow && ssrRow === afterRow);

console.log(`\n${'='.repeat(48)}`);
console.log(`SSR ROUTES SMOKE: ${pass} passed, ${fail.length} failed`);
if (fail.length) { console.log('FAILED:', fail.join('; ')); process.exit(1); }
