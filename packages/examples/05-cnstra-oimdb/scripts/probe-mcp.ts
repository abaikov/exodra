// Drives the cnstra MCP server over stdio (newline-delimited JSON-RPC) to prove
// the AI tools actually answer. Run: npx tsx scripts/probe-mcp.ts
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn('npx', ['tsx', 'mcp/cns-mcp.ts'], {
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
            /* ignore non-JSON lines */
        }
    }
});

const send = (msg: unknown) => child.stdin.write(`${JSON.stringify(msg)}\n`);
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function main() {
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'probe', version: '0' } } });
    await wait(1500);
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    await wait(800);
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'cns_get_graph', arguments: {} } });
    await wait(1200);

    const tools = (responses[2] as { result?: { tools?: Array<{ name: string }> } })?.result?.tools ?? [];
    console.log('TOOLS EXPOSED:', tools.map(t => t.name).join(', ') || '(none)');

    const graph = responses[3] as {
        result?: { content?: Array<{ type: string; text?: string }> };
    };
    const text = graph?.result?.content?.find(c => c.type === 'text')?.text ?? '';
    console.log('--- cns_get_graph (first 700 chars) ---');
    console.log(text.slice(0, 700));

    const ok = tools.length > 0 && text.length > 0;
    console.log(ok ? 'PROBE MCP: PASS' : 'PROBE MCP: FAIL');
    child.kill();
    process.exit(ok ? 0 : 1);
}

main().catch(err => {
    console.error('PROBE MCP: ERROR', err);
    child.kill();
    process.exit(1);
});
