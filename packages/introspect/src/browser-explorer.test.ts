import { createServer, type Server } from 'http';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ExodraBrowserExplorer, ExplorationUnavailableError } from './browser-explorer.js';

// Deliberately imperfect: an image with no alt, an unlabelled button, no <html lang>.
// The explorer must REPORT these rather than invent a clean bill of health.
const PAGE = `<!doctype html>
<html><head><title>Fixture</title></head>
<body>
  <main id="root">
    <h1>hello</h1>
    <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
    <button id="go"></button>
    <button id="labelled" aria-label="ok">x</button>
  </main>
  <script>document.getElementById('go').addEventListener('click', () => {
    document.title = 'clicked';
  });</script>
</body></html>`;

let server: Server;
let baseUrl = '';
const outDir = join(tmpdir(), `exo-explore-${process.pid}`);

// Probed at MODULE scope: `it.runIf` is evaluated while tests are collected, which
// happens before any beforeAll hook runs.
const playwrightAvailable = await import('playwright').then(
  () => true,
  () => false
);

beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(PAGE);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await rm(outDir, { recursive: true, force: true });
});

describe('ExodraBrowserExplorer', () => {
    it('fails loudly when nothing serves the URL and no dev command is set', async () => {
        const explorer = new ExodraBrowserExplorer(process.cwd(), {
            // Port 1 is reserved; nothing can be listening there.
            baseUrl: 'http://127.0.0.1:1',
            devCommand: null,
        });
        await expect(explorer.explore()).rejects.toBeInstanceOf(
            ExplorationUnavailableError
        );
        await explorer.cleanup();
    });

    it.runIf(playwrightAvailable)(
        'measures a real page: metrics, tree, screenshot, interaction, insights',
        async () => {
            const explorer = new ExodraBrowserExplorer(outDir, {
                baseUrl,
                devCommand: null, // attach to the fixture server above
                headless: true,
                screenshotDir: '.',
                scenarios: ['#go'],
                analysisDepth: 'detailed',
            });

            let result;
            try {
                result = await explorer.explore();
            } finally {
                await explorer.cleanup();
            }

            // Metrics are read from the browser, not invented.
            expect(result.performance.loadTime).toBeGreaterThanOrEqual(0);
            expect(result.performance.bundleSize).toBeGreaterThanOrEqual(0);

            // Rendered tree with real layout boxes.
            expect(result.componentTree.length).toBeGreaterThan(0);
            const root = result.componentTree[0];
            expect(root.type).toBe('main');
            expect(root.props.id).toBe('root');
            expect(root.location.width).toBeGreaterThan(0);
            expect(root.children.some(c => c.type === 'h1')).toBe(true);

            // The scenario actually clicked, and the click actually ran.
            expect(result.interactions).toHaveLength(1);
            expect(result.interactions[0].target).toBe('#go');
            expect(result.interactions[0].result).not.toBe('no match');
            expect(String(result.interactions[0].result)).not.toMatch(/^failed:/);

            // Screenshot exists on disk.
            expect(result.screenshots.length).toBeGreaterThan(0);
            expect(existsSync(result.screenshots[0])).toBe(true);

            // Insights are derived from the page's real defects.
            const messages = result.insights.map(i => i.message).join(' | ');
            expect(messages).toMatch(/without an alt attribute/);
            expect(messages).toMatch(/no text and no aria-label/);
            expect(messages).toMatch(/no lang attribute/);
            // The fixture DOES have a title — that must not be reported.
            expect(messages).not.toMatch(/no <title>/);
        },
        120_000
    );
});
