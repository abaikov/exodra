// Full integration test: SSR -> hydrate -> interact (cnstra commands) -> oimdb
// reactivity -> DOM updates. Run: npx tsx scripts/smoke-app.ts
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/',
});
const g = globalThis as Record<string, unknown>;
for (const k of [
    'window',
    'document',
    'Node',
    'Text',
    'Element',
    'HTMLElement',
    'DocumentFragment',
    'MouseEvent',
    'Event',
]) {
    g[k] = (dom.window as unknown as Record<string, unknown>)[k];
}

const tick = () => new Promise<void>(r => setTimeout(r, 0));

async function main() {
    const { render } = await import('../src/entry-server');
    const { bootstrap } = await import('../src/app/bootstrap');
    const { appView } = await import('../src/ui/views');
    const { hydrate } = await import('@exodra/dom');

    // 1. Server render + SSR state script (carries the oimdb snapshot)
    const { appHtml, stateScript } = render();
    dom.window.document.body.innerHTML = appHtml + stateScript;

    // 2. Client reads the @exodra/ssr state script, then bootstraps + hydrates
    const stateEl = dom.window.document.getElementById('__EXODRA_STATE__');
    const state = stateEl?.textContent ? JSON.parse(stateEl.textContent).todos : undefined;
    const { vm } = bootstrap(state);
    const root = dom.window.document.getElementById('app')!;
    hydrate(appView(vm), root as unknown as Element);
    vm.bindLive();

    const doc = dom.window.document;
    const activeStat = () =>
        doc.querySelector('.stats__item--active strong')?.textContent;
    const doneStat = () =>
        doc.querySelector('.stats__item--done strong')?.textContent;
    const todoCount = () => doc.querySelectorAll('.todo').length;
    const errorText = () => doc.querySelector('.error')?.textContent;

    console.log('initial: active=', activeStat(), 'done=', doneStat(), 'todos=', todoCount());

    // 3. Toggle t-1 (active -> done)
    (doc.querySelector('[data-id="t-1"] .todo__toggle') as HTMLElement | null)?.click();
    await tick();
    const t1Done = doc.querySelector('[data-id="t-1"]')?.className.includes('todo--done');
    console.log('after toggle t-1: active=', activeStat(), 'done=', doneStat(), 't-1 done class=', t1Done);

    // 4. Add a todo to "work"
    (doc.getElementById('add-title-work') as HTMLInputElement).value = 'Fresh task';
    (doc.getElementById('add-tags-work') as HTMLInputElement).value = 'new, hot';
    (doc.querySelector('.column[data-list="work"] .add__btn') as HTMLElement | null)?.click();
    await tick();
    const hasFresh = !!Array.from(doc.querySelectorAll('.todo__title')).find(
        n => n.textContent === 'Fresh task'
    );
    const activeAfterAdd = activeStat();
    console.log('after add: active=', activeAfterAdd, 'todos=', todoCount(), 'has new todo=', hasFresh);

    // 5. Invalid add (empty title) -> validation error surfaced
    (doc.getElementById('add-title-personal') as HTMLInputElement).value = '   ';
    (doc.querySelector('.column[data-list="personal"] .add__btn') as HTMLElement | null)?.click();
    await tick();
    console.log('after invalid add: error=', JSON.stringify(errorText()));

    // 6. Remove the new todo
    const freshId = Array.from(doc.querySelectorAll('.todo')).find(
        n => n.querySelector('.todo__title')?.textContent === 'Fresh task'
    )?.getAttribute('data-id');
    (doc.querySelector(`[data-id="${freshId}"] .todo__del`) as HTMLElement | null)?.click();
    await tick();
    console.log('after remove: todos=', todoCount());

    const ok =
        activeAfterAdd === '5' &&
        t1Done === true &&
        hasFresh === true &&
        (errorText() ?? '').includes('empty') &&
        todoCount() === 6 &&
        activeStat() === '4';
    console.log(ok ? 'SMOKE APP: PASS' : 'SMOKE APP: FAIL');
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error('SMOKE APP: ERROR', err);
    process.exit(1);
});
