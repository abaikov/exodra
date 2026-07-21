// Proves the two-way URL binding via router.bindQuery end-to-end in the DOM:
//   - moving the <select> writes the URL AND filters the board;
//   - an external URL change (back/forward) updates BOTH the <select> value AND
//     the board — the thing static `selected={...}` markup could not do.
// Run via vite-node: npx vite-node scripts/smoke-urlsync.ts
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    { url: 'http://localhost/' }
);
const g = globalThis as Record<string, unknown>;
for (const k of [
    'window',
    'document',
    'Node',
    'Text',
    'Element',
    'HTMLElement',
    'DocumentFragment',
    'Comment',
    'Event',
]) {
    g[k] = (dom.window as unknown as Record<string, unknown>)[k];
}

const flush = () => new Promise(r => setTimeout(r, 0));

async function main(): Promise<void> {
    const { renderToString } = await import('@exodra/string');
    const { hydrate } = await import('@exodra/dom');
    const { createRouter, createBrowserHistory } = await import('@exodra/router');
    const { createTodoStore } = await import('../src/store/todo-store');
    const { createTodoCns } = await import('../src/cns/todo-cns');
    const { createViewModel } = await import('../src/app/view-model');
    const { appView } = await import('../src/ui/views');
    const { seedLists, seedTodos } = await import('../src/domain/seed');

    const store = createTodoStore();
    store.lists.collection.upsertMany([...seedLists]);
    store.todos.collection.upsertMany([...seedTodos]);
    const cns = createTodoCns(store, { persistDelayMs: 0 });

    const router = createRouter([], {
        history: createBrowserHistory({ window: dom.window as unknown as Window }),
    });
    const vm = createViewModel(store, cns, {
        filters: {
            status: router.bindQuery('status', { default: 'all' }),
            tag: router.bindQuery('tag'),
            query: router.bindQuery('q'),
        },
    });

    const html = renderToString(appView(vm));
    const root = document.getElementById('root')!;
    root.innerHTML = html;
    const app = root.firstElementChild as unknown as Element;
    hydrate(appView(vm), app);
    vm.bindLive();

    const statusSelect = document.getElementById('filter-status') as HTMLSelectElement;
    const rows = () => app.querySelectorAll('.column__list .todo').length;
    const doneTotal = store.todos.collection
        .getAll()
        .filter(t => t.status === 'done').length;
    const allTotal = store.todos.collection.countAll();

    // --- direction 1: control -> URL (+ board) ---
    statusSelect.value = 'done';
    statusSelect.dispatchEvent(new dom.window.Event('change'));
    await flush();
    const urlAfterControl = dom.window.location.search;
    const boardAfterControl = rows();

    // --- direction 2: external URL change (back/forward) -> control + board ---
    await router.navigate('/?status=active');
    await flush();
    const selectAfterNav = statusSelect.value;
    const boardAfterNav = rows();
    const activeTotal = store.todos.collection
        .getAll()
        .filter(t => t.status === 'active').length;

    // --- clearing back to default drops the param ---
    await router.navigate('/');
    await flush();
    const selectAfterClear = statusSelect.value;
    const boardAfterClear = rows();

    const checks: [string, boolean][] = [
        ['moving the control writes ?status=done', /status=done/.test(urlAfterControl)],
        ['moving the control filters the board to done', boardAfterControl === doneTotal && doneTotal > 0],
        ['URL change updates the <select> value', selectAfterNav === 'active'],
        ['URL change filters the board to active', boardAfterNav === activeTotal && activeTotal > 0],
        ['clearing URL resets the <select> to all', selectAfterClear === 'all'],
        ['clearing URL restores every row', boardAfterClear === allTotal],
    ];

    let ok = true;
    for (const [label, pass] of checks) {
        console.log(`${pass ? '✓' : '✗'} ${label}`);
        ok = ok && pass;
    }
    console.log(`url="${urlAfterControl}" rows done/active/all=${doneTotal}/${activeTotal}/${allTotal}`);
    console.log(ok ? 'SMOKE URLSYNC: PASS' : 'SMOKE URLSYNC: FAIL');
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
