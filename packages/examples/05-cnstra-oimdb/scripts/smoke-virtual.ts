// Virtual list over an oimdb ordered global index, with the scroll VIEWPORT held
// in a shared oimdb reactive object (global state) that drives BOTH the list and a
// decoupled "on screen" readout. Proves: windowing, bounded node count, scroll
// re-window, global-state fan-out to a separate component, per-row reactivity, and
// — crucially — that a scroll is O(1)/O(window): the filter never runs per scroll.
// Run: npx vite-node scripts/smoke-virtual.ts
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><body></body>');
for (const k of ['document', 'Element', 'Text', 'Comment', 'Node', 'HTMLElement', 'DocumentFragment', 'Event'])
    (globalThis as Record<string, unknown>)[k] = (dom.window as unknown as Record<string, unknown>)[k];

const { mount } = await import('@exodra/dom');
const mod = await import('../src/pages/virtual');
const virtualPage = mod.default;
const { virtualMetrics } = mod;

let pass = 0;
const fail: string[] = [];
const ok = (n: string, c: boolean) => {
    if (c) { pass++; console.log('  ✓', n); }
    else { fail.push(n); console.log('  ✗', n); }
};
const tick = () => new Promise(r => setTimeout(r, 0));
const rows = (el: Element) => [...el.querySelectorAll('.vrow')];
const idOf = (r: Element) => r.getAttribute('data-id');
const readout = (el: Element) => el.querySelector('.vp-readout')?.textContent ?? '';

const c = document.createElement('div');
mount(virtualPage() as never, c);
await tick();
const vlist = c.querySelector('.vlist') as HTMLElement;
const spacer = c.querySelector('.vlist__spacer') as HTMLElement;

console.log('\n── initial window + global readout ──');
ok('spacer height = 10000 * 36px', spacer.getAttribute('style')?.includes('360000px') ?? false);
ok('only a window is mounted (<40 rows, not 10000)', rows(c).length > 0 && rows(c).length < 40);
ok('first mounted row is #0', idOf(rows(c)[0]) === 'r0');
ok('decoupled readout shows the top range', readout(c).startsWith('on screen #0'));
ok('readout shows 10,000 total', readout(c).includes('10,000 total'));

console.log('\n── scroll → viewport (global state) drives list AND readout ──');
vlist.scrollTop = 5000 * 36;
vlist.dispatchEvent(new dom.window.Event('scroll'));
await tick();
ok('still a bounded window (<40 rows)', rows(c).length > 0 && rows(c).length < 40);
ok('row #0 gone, window now around #5000', !c.querySelector('[data-id="r0"]') && !!c.querySelector('[data-id="r5000"]'));
ok('separate readout reflects the scroll via global state', readout(c).includes('#5000') || readout(c).includes('#4994'));

console.log('\n── a scroll is O(1)/O(window): filter never runs per scroll ──');
const beforeFilter = virtualMetrics.filterRuns;
for (let i = 0; i < 60; i++) {
    vlist.scrollTop = (i * 150) % (9000 * 36);
    vlist.dispatchEvent(new dom.window.Event('scroll'));
}
await tick();
ok('60 scrolls ran the filter ZERO extra times (no O(N) per scroll)', virtualMetrics.filterRuns === beforeFilter);
ok('window stayed bounded across 60 scrolls', rows(c).length < 40);

console.log('\n── filter recomputes once per query change (not per scroll) ──');
const input = c.querySelector('.add__input') as HTMLInputElement;
const beforeQuery = virtualMetrics.filterRuns;
input.value = '#123';
input.dispatchEvent(new dom.window.Event('input'));
await tick();
ok('filter ran exactly once on query change', virtualMetrics.filterRuns === beforeQuery + 1);
ok('filtered total dropped below 10,000', !readout(c).includes('10,000 total'));

console.log('\n── per-row reactivity survives virtualization ──');
input.value = '';
input.dispatchEvent(new dom.window.Event('input'));
await tick();
vlist.scrollTop = 5000 * 36;
vlist.dispatchEvent(new dom.window.Event('scroll'));
await tick();
const star = c.querySelector('[data-id="r5000"] .vrow__star') as HTMLElement;
ok('scrolled-in row star starts off', !star.className.includes('is-on'));
star.dispatchEvent(new dom.window.Event('click'));
await tick();
ok('star turns on (subscribeOnKey on a scrolled-in row)',
    (c.querySelector('[data-id="r5000"] .vrow__star')?.className ?? '').includes('is-on'));

console.log(`\n${'='.repeat(52)}`);
console.log(`VIRTUAL SMOKE: ${pass} passed, ${fail.length} failed`);
if (fail.length) { console.log('FAILED:', fail.join('; ')); process.exit(1); }
