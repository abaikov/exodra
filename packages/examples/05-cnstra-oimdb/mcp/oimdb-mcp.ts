// oimdb MCP server in offline/static mode (no browser, no WebSocket) — new in
// @oimdb/mcp 1.1.0. It builds the model in-process and answers oimdb_inspect /
// oimdb_dump / oimdb_collection from the seeded store, so an AI assistant can
// ask "what's the data model?" without running the app in a browser.
import { createOIMDevMcpServer } from '@oimdb/mcp';
import { createTodoStore } from '../src/store/todo-store';
import { registerOimdbDevtools } from '../src/app/devtools';
import { seedLists, seedTodos } from '../src/domain/seed';

// Build the store directly (not via bootstrap, which pulls in the JSX views) so
// this server runs under tsx. Seed representative rows so entity field names are
// available offline (TypeScript types are erased at runtime).
const store = createTodoStore();
store.lists.collection.upsertMany([...seedLists]);
store.todos.collection.upsertMany([...seedTodos]);
const registry = registerOimdbDevtools(store);

createOIMDevMcpServer({ registry })
    .start()
    .catch(err => {
        process.stderr.write(`[oimdb-mcp] fatal: ${String(err)}\n`);
        process.exit(1);
    });
