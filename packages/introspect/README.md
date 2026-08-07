# @exodra/introspect

AI-powered introspection, code analysis, and developer tooling for Exodra applications.

## Installation

```bash
npm install --save-dev @exodra/introspect
```

The package ships a CLI exposed as `exo-introspect`.

## Overview

`@exodra/introspect` analyzes Exodra projects and surfaces insights:

- **Code & component analysis** - structure, patterns, complexity
- **Performance analysis** - hotspots and optimization opportunities
- **Schema & route analysis** - schema relationships, route structure
- **Optional AI enhancement** - insights via configured AI providers
- **Editor integration** - Cursor / Claude setup

## CLI Usage

Run via `npx exo-introspect <command>` (the bin is `exo-introspect`):

```bash
# Quick health check of the project
npx exo-introspect quick-check --path src/

# Full project analysis
npx exo-introspect analyze

# Full analysis with AI enhancement, written to a file
npx exo-introspect analyze --ai --provider anthropic --format markdown -o report.md
```

### Commands

- `quick-check` - fast project health check (`-p, --path`)
- `analyze` - comprehensive analysis (`-p, --path`, `--ai`, `--provider`, `--model`, `--api-key`, `-f, --format`, `-o, --output`, `-v, --verbose`)
- `components` - analyze components for patterns and optimization (`-p, --path`, `-f, --format`)
- `performance` - analyze performance hotspots and bottlenecks (`-p, --path`)
- `schemas` - analyze schema definitions and relationships (`-p, --path`)
- `routes` - analyze routes and navigation structure (`-p, --path`)
- `explain <file>` - AI explanation of a code file (`--provider`, `--api-key`)
- `check-thresholds <file>` - check a saved analysis JSON against quality gates (`--max-errors`, `--max-warnings`, `--min-score`)
- `explore` - launch and explore the app in a real browser with optional AI analysis (`--headless`, `--scenarios`, `--url`, `--ai`)

  Requires **Playwright**, declared as an optional peer dependency so the rest of
  the CLI installs without downloading a browser:

  ```bash
  npm i -D playwright && npx playwright install chromium
  ```

  Without it `explore` fails with a clear message — it never reports success it did
  not achieve. It attaches to an already-running server at `--url`, or starts
  `npm run dev` and polls until that URL answers. What it reports is measured:
  navigation timing, First Contentful Paint, JS heap, transferred script bytes, the
  rendered element tree with layout boxes, screenshots, the result of each
  `--scenarios` click, and accessibility findings derived from the page itself.
- `setup` - automatic AI ecosystem setup (`--interactive`, `--silent`, `--project-root`)
- `setup-cursor` - generate Cursor (Claude Code) integration (`-p, --path`)
- `ai providers` - list configured AI providers
- `ai test` - test the AI provider connection (`--provider`)
- `plugins list` - list installed introspect plugins

> There is no `report` command. To produce a report file, use
> `analyze -o <file>` (with `-f json|markdown|html`).

## Programmatic API

The main entry points are `introspect` and `quickIntrospect`, plus `formatResults`:

```typescript
import { introspect, quickIntrospect, formatResults } from '@exodra/introspect';

// Quick health check — takes a project root path
const health = await quickIntrospect('./');
console.log(health.health, health.summary, health.topIssues);

// Full analysis — takes an options object
const result = await introspect({
  projectRoot: './src',
  scope: 'project',          // 'file' | 'project' | 'workspace'
  enableAI: false,
  verbose: false,
});

// Format a result as json | markdown | html (default: json)
const markdown = formatResults(result, 'markdown');
console.log(markdown);
```

Other exports include analyzer classes (`SchemaAnalyzer`, `ComponentAnalyzer`,
`PerformanceAnalyzer`, `CodeAnalyzer`, `ExoRouterAnalyzer`), the `IntrospectionEngine`,
the plugin system (`ExoPluginManager`, `ExoPluginDiscovery`), the universal AI system
(`universalAI`, `ExoUniversalAI`), and an ESLint plugin (`eslintPlugin`).

> There is no `analyze()` export. Use `introspect(...)` / `quickIntrospect(...)`.

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
