// Drives the oimdb MCP server in OFFLINE mode (no browser) to prove the static
// tools answer from the in-process model. Run: npx tsx scripts/probe-oimdb-mcp.ts
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn('npx', ['tsx', 'mcp/oimdb-mcp.ts'], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
});

let buffer = '';
const responses: Record<number, unknown> = {};
child.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
            const msg = JSON.parse(line) as { id?: number };
            if (typeof msg.id === 'number') responses[msg.id] = msg;
        } catch {
            /* ignore */
        }
    }
});

const send = (msg: unknown) => child.stdin.write(`${JSON.stringify(msg)}\n`);
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const textOf = (id: number) =>
    (responses[id] as { result?: { content?: Array<{ type: string; text?: string }> } })
        ?.result?.content?.find(c => c.type === 'text')?.text ?? '';

async function main() {
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'probe', version: '0' } } });
    await wait(2000);
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    await wait(800);
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'oimdb_dump', arguments: {} } });
    await wait(800);
    send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'oimdb_collection', arguments: { name: 'todos' } } });
    await wait(1000);

    const tools = (responses[2] as { result?: { tools?: Array<{ name: string }> } })?.result?.tools ?? [];
    console.log('TOOLS:', tools.map(t => t.name).join(', ') || '(none)');
    const dump = textOf(3);
    console.log('--- oimdb_dump (offline) ---');
    console.log(dump.slice(0, 500));
    const coll = textOf(4);
    console.log('--- oimdb_collection todos (first 300) ---');
    console.log(coll.slice(0, 300));

    const ok = tools.length > 0 && /todos/.test(dump) && /lists/.test(dump);
    console.log(ok ? 'PROBE OIMDB MCP: PASS' : 'PROBE OIMDB MCP: FAIL');
    child.kill();
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error('PROBE OIMDB MCP: ERROR', err);
    child.kill();
    process.exit(1);
});
