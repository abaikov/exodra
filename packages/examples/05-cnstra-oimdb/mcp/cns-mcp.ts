// CNStra MCP server entry. Started via `npm run mcp` (see .claude/settings.json).
// Exposes the workspace orchestration graph (neurons, collaterals, dendrites) to
// an AI assistant over stdio so it can introspect how commands flow.
import { startCNSMCPServer } from '@cnstra/mcp';
import { createWorkspaceStore, loadSnapshot } from '../src/store/workspace-store';
import { createWorkspaceCns } from '../src/cns/workspace-cns';
import { createSeed } from '../src/domain/seed';

// Seeded from the same snapshot the app boots with, so the graph is introspected
// against representative data.
const store = createWorkspaceStore();
loadSnapshot(store, createSeed());
const { cns, registry } = createWorkspaceCns(store);

startCNSMCPServer(cns, registry, {
    name: 'workspace-cns',
    version: '0.1.0',
}).catch(err => {
    process.stderr.write(`[cns-mcp] fatal: ${String(err)}\n`);
    process.exit(1);
});
