// Proves FINE-GRAINED reactivity: toggling one todo mutates only its own <li>'s
// bound nodes; every other node (and the toggled node itself) keeps its exact
// DOM identity — i.e. no column re-render. A coarse reset() would replace nodes
// and fail the identity checks below.
// Run via vite-node (JSX needs the babel transform): npx vite-node scripts/smoke-fine.ts
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="root"></div></body></html>'
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
]) {
    g[k] = (dom.window as unknown as Record<string, unknown>)[k];
}

const flush = () => new Promise(r => setTimeout(r, 0));

async function main(): Promise<void> {
    const { renderToString } = await import('@exodra/string');
    const { hydrate } = await import('@exodra/dom');
    const { bootstrap } = await import('../src/app/bootstrap');
    const { appView } = await import('../src/ui/views');

    const { store, vm } = bootstrap(); // seeds lists + todos

    // Pick a list with >=2 todos; target an active one, keep a sibling.
    const byList = new Map<string, { id: string; status: string }[]>();
    for (const t of store.todos.collection.getAll()) {
        const arr = byList.get(t.listId) ?? [];
        arr.push(t);
        byList.set(t.listId, arr);
    }
    const group = [...byList.values()].find(grp => grp.length >= 2);
    if (!group) throw new Error('need a list with >=2 todos');
    const target = group.find(t => t.status === 'active') ?? group[0];
    const sibling = group.find(t => t.id !== target.id)!;

    // SSR -> DOM -> hydrate the live view-model.
    const html = renderToString(appView(vm));
    const root = document.getElementById('root')!;
    root.innerHTML = html;
    const app = root.firstElementChild as unknown as Element;
    hydrate(appView(vm), app);
    vm.bindLive();

    const liOf = (pk: string) => app.querySelector(`[data-id="${pk}"]`);
    const targetLi = liOf(target.id)!;
    const siblingLi = liOf(sibling.id)!;
    const toggleBtn = () => targetLi.querySelector('.todo__toggle')!;

    const before = {
        targetClass: targetLi.getAttribute('class'),
        targetGlyph: toggleBtn().textContent,
        active: document
            .querySelector('.stats__item--active strong')!
            .textContent,
    };

    // Toggle the target via the real handler -> cnstra -> oimdb.
    vm.handlers.toggle(target.id);
    await flush();
    await flush();

    const after = {
        sameTargetNode: liOf(target.id) === targetLi, // node NOT replaced
        sameSiblingNode: liOf(sibling.id) === siblingLi, // untouched
        targetClass: targetLi.getAttribute('class'),
        targetGlyph: toggleBtn().textContent,
        active: document
            .querySelector('.stats__item--active strong')!
            .textContent,
    };

    const checks: [string, boolean][] = [
        ['target <li> node identity preserved', after.sameTargetNode],
        ['sibling <li> node identity preserved', after.sameSiblingNode],
        ['target class flipped to done', /todo--done/.test(after.targetClass ?? '')],
        ['target was not done before', !/todo--done/.test(before.targetClass ?? '')],
        ['toggle glyph updated ☐ -> ☑', before.targetGlyph === '☐' && after.targetGlyph === '☑'],
        ['active count decremented', Number(after.active) === Number(before.active) - 1],
    ];

    let ok = true;
    for (const [label, pass] of checks) {
        console.log(`${pass ? '✓' : '✗'} ${label}`);
        ok = ok && pass;
    }
    console.log(
        `before: class="${before.targetClass}" glyph=${before.targetGlyph} active=${before.active}`
    );
    console.log(
        `after:  class="${after.targetClass}" glyph=${after.targetGlyph} active=${after.active}`
    );
    console.log(ok ? 'SMOKE FINE: PASS' : 'SMOKE FINE: FAIL');
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
