import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

// Serves the production build (run `npm run build` first).
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 5173);

async function main() {
    const app = express();
    const clientDir = path.resolve(projectRoot, 'dist/client');
    const template = fs.readFileSync(path.resolve(clientDir, 'index.html'), 'utf-8');
    const { render, appStyles } = (await import(
        path.resolve(projectRoot, 'dist/server/entry-server.js')
    )) as {
        render: (url?: string) => { appHtml: string; stateScript: string };
        appStyles: string;
    };

    app.use(express.static(clientDir, { index: false }));
    app.use(/.*/, (req, res) => {
        const { appHtml, stateScript } = render(req.originalUrl);
        const html = template
            .replace('<!--app-styles-->', `<style>${appStyles}</style>`)
            .replace('<!--app-html-->', appHtml)
            .replace('<!--app-state-->', stateScript);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    });

    app.listen(PORT, () => {
        console.log(`prod server: http://localhost:${PORT}`);
    });
}

main();
