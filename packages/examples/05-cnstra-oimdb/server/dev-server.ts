import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 5173);

async function main() {
    const app = express();
    const vite = await createViteServer({
        root: projectRoot,
        server: { middlewareMode: true },
        appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use(/.*/, async (req, res) => {
        try {
            const url = req.originalUrl;
            const template = await vite.transformIndexHtml(
                url,
                fs.readFileSync(path.resolve(projectRoot, 'index.html'), 'utf-8')
            );

            const { render } = (await vite.ssrLoadModule('/src/entry-server.ts')) as {
                render: (url?: string) => { appHtml: string; stateScript: string };
            };
            const { appStyles } = (await vite.ssrLoadModule('/src/ui/styles.ts')) as {
                appStyles: string;
            };

            const { appHtml, stateScript } = render(url);
            const html = template
                .replace('<!--app-styles-->', `<style>${appStyles}</style>`)
                .replace('<!--app-html-->', appHtml)
                .replace('<!--app-state-->', stateScript);

            res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (err) {
            vite.ssrFixStacktrace(err as Error);
            // eslint-disable-next-line no-console
            console.error(err);
            res.status(500).end((err as Error).message);
        }
    });

    app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`dev server: http://localhost:${PORT}`);
    });
}

main();
