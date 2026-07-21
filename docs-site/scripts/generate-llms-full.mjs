// Generates static/llms-full.txt — the complete Exodra docs concatenated into
// one file for LLM context (llmstxt.org "full" companion to the compact
// llms.txt). Runs as docs-site `prebuild`, so it stays in sync with the docs.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..', 'docs');
const outFile = join(__dirname, '..', 'static', 'llms-full.txt');

// Reading order — mirrors sidebars.js so the narrative flows top to bottom.
const ORDER = [
  'getting-started',
  'benchmarks',
  'core/concepts',
  'guides/jsx',
  'guides/components',
  'guides/lists',
  'guides/ssr',
  'guides/react',
  'guides/ai-development',
  'api/core',
  'api/reactivity',
  'api/dom',
  'api/router',
  'api/string',
  'api/forms',
  'tooling/create-exodra',
  'tooling/vite-plugin',
  'tooling/babel-plugin',
  'tooling/introspect',
  'tooling/profiler',
];

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;

function splitFrontmatter(md) {
  const m = md.match(FRONTMATTER);
  if (!m) return { title: null, body: md.trim() };
  const t = m[1].match(/title:\s*(.+)/);
  const title = t ? t[1].trim().replace(/^['"]|['"]$/g, '') : null;
  return { title, body: md.slice(m[0].length).trim() };
}

const header = `# Exodra — full documentation (for LLMs)

The complete Exodra documentation, concatenated into one file for LLM context.
For a compact cheat‑sheet, see llms.txt. Canonical source: https://exodra.org/docs
`;

let out = header;

for (const slug of ORDER) {
  try {
    const raw = await readFile(join(docsDir, `${slug}.md`), 'utf8');
    const { title, body } = splitFrontmatter(raw);
    out += `\n\n${'='.repeat(78)}\n`;
    // Prepend the frontmatter title only if the body doesn't already open with one.
    if (title && !/^#\s/.test(body)) out += `# ${title}\n\n`;
    out += `${body}\n`;
  } catch (err) {
    console.warn(`[llms-full] skipped ${slug}: ${err.message}`);
  }
}

await writeFile(outFile, `${out.trim()}\n`);
console.log(`[llms-full] wrote ${outFile}`);
