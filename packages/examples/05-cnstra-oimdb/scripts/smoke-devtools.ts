// Verify oimdb devtools registration. Run: npx tsx scripts/smoke-devtools.ts
import { createTodoStore } from '../src/store/todo-store';
import { registerOimdbDevtools } from '../src/app/devtools';
import { seedLists, seedTodos } from '../src/domain/seed';

const store = createTodoStore();
store.lists.collection.upsertMany([...seedLists]);
store.todos.collection.upsertMany([...seedTodos]);
const reg = registerOimdbDevtools(store);

console.log('--- registry.dumpString() ---');
console.log(reg.dumpString());

const inspected = reg.inspect();
const todos = inspected.collections['todos'];
const lists = inspected.collections['lists'];

console.log('todos count:', todos?.count);
console.log('todos index keys:', Object.fromEntries(Object.entries(todos?.indexes ?? {}).map(([k, v]) => [k, v.keys])));
console.log('lists count:', lists?.count);

const ok =
    todos?.count === 6 &&
    lists?.count === 3 &&
    (todos?.indexes['byStatus']?.keys?.length ?? 0) >= 1 &&
    todos?.relations['listId'] === 'lists';
console.log(ok ? 'SMOKE DEVTOOLS: PASS' : 'SMOKE DEVTOOLS: FAIL');
process.exit(ok ? 0 : 1);
