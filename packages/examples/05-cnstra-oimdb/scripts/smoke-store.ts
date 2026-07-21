// Store-layer smoke: the oimdb workspace store — derived indexes stay correct
// and a snapshot round-trips (the same getAll()/upsertMany path used for SSR).
// Run: npx vite-node scripts/smoke-store.ts
import {
    createWorkspaceStore,
    loadSnapshot,
    takeSnapshot,
} from '../src/store/workspace-store';
import { createSeed } from '../src/domain/seed';

let pass = 0;
const fail: string[] = [];
const ok = (n: string, c: boolean) => {
    if (c) { pass++; console.log('  ✓', n); }
    else { fail.push(n); console.log('  ✗', n); }
};

const oimdbInstance = createWorkspaceStore();
loadSnapshot(oimdbInstance, createSeed());
const tasks = oimdbInstance.tasks.collection.getAll();

console.log('\n── derived indexes ──');
let indexedByStatus = 0;
for (const s of oimdbInstance.statuses.collection.getAll()) {
    indexedByStatus += oimdbInstance.tasksByStatus.getPksByKey(s.id).size;
}
ok('tasksByStatus indexes every task exactly once', indexedByStatus === tasks.length);

const project = oimdbInstance.projects.collection.getAll()[0].id;
const byProject = [...oimdbInstance.tasksByProject.getPksByKey(project)];
ok(
    'tasksByProject returns only that project’s tasks',
    byProject.length > 0 &&
        byProject.every(id => oimdbInstance.tasks.collection.getOneByPk(id)?.projectId === project)
);

const firstComment = oimdbInstance.comments.collection.getAll()[0];
ok(
    'commentsByTask links a comment to its task',
    !firstComment || oimdbInstance.commentsByTask.getPksByKey(firstComment.taskId).size > 0
);

const team = oimdbInstance.teams.collection.getAll()[0].id;
const teamMembers = [...oimdbInstance.membersByTeam.getPksByKey(team)];
ok(
    'membersByTeam groups members by team',
    teamMembers.length > 0 &&
        teamMembers.every(id => oimdbInstance.members.collection.getOneByPk(id)?.teamId === team)
);

console.log('\n── snapshot round-trip ──');
const snapshot = takeSnapshot(oimdbInstance);
const restored = createWorkspaceStore();
loadSnapshot(restored, snapshot);
ok('round-trip preserves task count', restored.tasks.collection.getAll().length === tasks.length);
ok(
    'round-trip preserves task fields',
    restored.tasks.collection.getOneByPk(tasks[0].id)?.title === tasks[0].title
);
ok(
    'round-trip rebuilds indexes in the fresh store',
    restored.tasksByProject.getPksByKey(project).size === byProject.length
);

console.log(`\n${'='.repeat(44)}`);
console.log(`STORE SMOKE: ${pass} passed, ${fail.length} failed`);
if (fail.length) { console.log('FAILED:', fail.join('; ')); process.exit(1); }
