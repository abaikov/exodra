// Proves client-side persistence: workspace-store edits serialize to localStorage
// (coalesced per microtask), restore into a fresh store, and reset clears them.
// Run: npx vite-node scripts/smoke-persist.ts

// Map-backed localStorage shim — persistence.ts uses globalThis.localStorage.
const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
};

const { createWorkspaceStore, loadSnapshot } = await import('../src/store/workspace-store');
const { createSeed } = await import('../src/domain/seed');
const { attachPersistence, loadPersisted, restorePersisted, clearPersisted } =
    await import('../src/app/persistence');

let pass = 0;
const fail: string[] = [];
const ok = (n: string, c: boolean) => {
    if (c) { pass++; console.log('  ✓', n); }
    else { fail.push(n); console.log('  ✗', n); }
};
const tick = () => new Promise(r => setTimeout(r, 0));

const store = createWorkspaceStore();
loadSnapshot(store, createSeed());
const detach = attachPersistence(store);

// Mutate → the store's change fans out to persistence, which coalesces a write.
store.tasks.collection.upsertOne({
    id: 'persist-1',
    projectId: 'p-web',
    milestoneId: null,
    title: 'Persisted task',
    statusId: 's-todo',
    labelId: null,
    assigneeId: null,
    tagIds: [],
    priority: 'medium',
    createdAt: 1,
});
store.queue.flush();
await tick();

const saved = loadPersisted();
ok('edit is serialized to localStorage', !!saved && saved.tasks.some(t => t.id === 'persist-1'));
ok('seed data is preserved alongside the edit', !!saved && saved.tasks.length > 1);

const restored = createWorkspaceStore();
ok('restorePersisted returns true', restorePersisted(restored));
ok('restored store has the persisted task', !!restored.tasks.collection.getOneByPk('persist-1'));

clearPersisted();
ok('clearPersisted wipes storage', loadPersisted() === null);

detach();
console.log(`\nPERSIST SMOKE: ${pass} passed, ${fail.length} failed`);
if (fail.length) { console.log('FAILED:', fail.join('; ')); process.exit(1); }
