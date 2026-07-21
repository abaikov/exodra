// Proves the client HYDRATES the SSR DOM (no teardown/remount) and that routing
// swaps pages cleanly. Run:  npx vite-node scripts/smoke-hydrate.ts
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost/' });
const w = dom.window as unknown as Record<string, unknown>;
for (const k of [
    'document', 'Element', 'Text', 'Comment', 'Node', 'HTMLElement',
    'DocumentFragment', 'Event', 'KeyboardEvent', 'window', 'history', 'location',
]) {
    (globalThis as Record<string, unknown>)[k] = w[k];
}
(globalThis as Record<string, unknown>).window = dom.window;

let pass = 0;
const fail: string[] = [];
const ok = (n: string, c: boolean) => {
    if (c) { pass++; console.log('  ✓', n); }
    else { fail.push(n); console.log('  ✗', n); }
};
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));

const { render } = await import('../src/entry-server');
const { createSeed } = await import('../src/domain/seed');
const { mountApp } = await import('../src/app/mount-app');

console.log('\n── SSR → hydrate: the same DOM nodes are reused (no remount) ──');
const { appHtml, stateScript } = render('/');
document.body.innerHTML = `<div id="app">${appHtml}</div>${stateScript}`;
const root = document.getElementById('app') as HTMLElement;

ok('SSR put a board card in the outlet', !!root.querySelector('#outlet [data-id="tk-3"]'));
const cardBefore = root.querySelector('#outlet [data-id="tk-3"]');
const navBefore = root.querySelector('.nav__link');

const router = mountApp(root, createSeed());
await tick();

const cardAfter = root.querySelector('#outlet [data-id="tk-3"]');
ok('board card is the SAME node after hydrate (not rebuilt)', !!cardBefore && cardBefore === cardAfter);
ok('shell nav is the SAME node after hydrate', !!navBefore && navBefore === root.querySelector('.nav__link'));
ok('no duplicate shell (#app has one child)', root.children.length === 1);

console.log('\n── hydrated board is interactive (move → store + DOM) ──');
{
    const card = root.querySelector('[data-id="tk-5"]') as HTMLElement;
    const startCol = card?.closest('.col')?.getAttribute('data-status');
    (card.querySelector('[aria-label="Move right"]') as HTMLElement).dispatchEvent(new dom.window.Event('click'));
    await tick();
    const after = root.querySelector('[data-id="tk-5"]')?.closest('.col')?.getAttribute('data-status');
    ok('move on a HYDRATED card changes its column', startCol === 's-todo' && after === 's-doing');
}

console.log('\n── routing: navigate away + back (no "two live positions" throw) ──');
{
    await router.navigate('/people');
    await tick();
    ok('navigated to People page', !!root.querySelector('#outlet .page--people'));
    ok('Board disposed (gone from outlet)', !root.querySelector('#outlet .page--board'));
    await router.navigate('/');
    await tick();
    ok('navigated back to Board (fresh schema, no reuse throw)', !!root.querySelector('#outlet .page--board'));
    await router.navigate('/taxonomy');
    await tick();
    ok('Tags & Labels page renders', !!root.querySelector('#outlet .page--taxonomy'));
}

console.log(`\n${'='.repeat(48)}`);
console.log(`HYDRATE SMOKE: ${pass} passed, ${fail.length} failed`);
if (fail.length) { console.log('FAILED:', fail.join('; ')); process.exit(1); }
