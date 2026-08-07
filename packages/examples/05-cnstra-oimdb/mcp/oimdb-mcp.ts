// oimdb MCP server in offline/static mode (no browser, no WebSocket) — new in
// @oimdb/mcp 1.1.0. It builds the model in-process and answers oimdb_inspect /
// oimdb_dump / oimdb_collection from the seeded store, so an AI assistant can
// ask "what's the data model?" without running the app in a browser.
import { createOIMDevMcpServer } from '@oimdb/mcp';
import { createWorkspaceStore, loadSnapshot } from '../src/store/workspace-store';
import { registerOimdbDevtools } from '../src/app/devtools';
import { createSeed } from '../src/domain/seed';

// Build the store directly (not via bootstrap, which pulls in the JSX views) so
// this server runs under tsx. Seeded from the app's own snapshot so every
// collection has representative rows — entity field names are only discoverable
// from data, since TypeScript types are erased at runtime.
const store = createWorkspaceStore();
loadSnapshot(store, createSeed());
const registry = registerOimdbDevtools(store);

createOIMDevMcpServer({ registry })
    .start()
    .catch(err => {
        process.stderr.write(`[oimdb-mcp] fatal: ${String(err)}\n`);
        process.exit(1);
    });
