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
//
// AND IT DID NOT, FOR LONG ENOUGH THAT NOBODY NOTICED. A check found four
// pages out of step: `security` and `tooling/babel-plugin` were here and in no sidebar entry
// (readable by a model, unreachable by a person), and `errors` was navigable and absent here.
// A comment claiming a mirror is not a mirror; `scripts/check-llms.mjs` is what compares the
// two lists now, so this order and the sidebar's cannot drift apart in silence again.
const ORDER = [
  'getting-started',
  'errors',
  'benchmarks',
  // The coverage report on the page above: floor / strategy / situation for all 24 axes, and the
  // list of ordinary situations the suite does not measure. It follows `benchmarks` for the same
  // reason it does in the sidebar — it is a reading of that page's instrument.
  'benchmarks-coverage',
  'security',
  'limits-and-plans',
  // WHY EXODRA — the positioning section. It goes near the front on purpose: a reader (or a
  // model) arriving at this file cold needs the thesis and its evidence before the API tables.
  'why/sugar-not-restrictions',
  'why/abstractions-collapse',
  'why/the-renderer-slot',
  'why/what-the-floor-says',
  'why/order-without-recomputing',
  'why/what-others-forbid',
  'why/imperative-escape',
  'core/concepts',
  'guides/jsx',
  'guides/components',
  'guides/lists',
  'guides/rendering',
  'guides/children',
  'guides/optimizations',
  'guides/plugins',
  'guides/ssr',
  'guides/testing',
  'guides/react',
  'guides/react-compat',
  'guides/to-react',
  'guides/ai-development',
  'troubleshooting',
  'api/core',
  'api/dom',
  'api/router',
  'api/string',
  'api/forms',
  'api/style',
  'tooling/create-exodra',
  'tooling/vite-plugin',
  'tooling/babel-preset',
  'tooling/bundlers',
  'tooling/cdn',
  'tooling/swc-plugin',
  'tooling/introspect',
  'tooling/profiler',
  'architecture/package-graph',
  'architecture/dependency-graph',
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
