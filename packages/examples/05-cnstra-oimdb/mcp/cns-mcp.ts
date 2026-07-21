// CNStra MCP server entry. Started via `npm run mcp` (see .claude/settings.json).
// Exposes the todo orchestration graph (neurons, collaterals, dendrites) to an
// AI assistant over stdio so it can introspect how commands flow.
import { startCNSMCPServer } from '@cnstra/mcp';
import { createTodoStore } from '../src/store/todo-store';
import { createTodoCns } from '../src/cns/todo-cns';
import { seedLists } from '../src/domain/seed';

const store = createTodoStore();
store.lists.collection.upsertMany([...seedLists]);
const { cns, registry } = createTodoCns(store);

startCNSMCPServer(cns, registry, {
    name: 'todo-cns',
    version: '0.1.0',
}).catch(err => {
    process.stderr.write(`[cns-mcp] fatal: ${String(err)}\n`);
    process.exit(1);
});
