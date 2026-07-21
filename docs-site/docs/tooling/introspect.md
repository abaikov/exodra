---
title: Introspect
---

# Introspect

[`@exodra/introspect`](https://www.npmjs.com/package/@exodra/introspect) is
dev/analysis tooling for Exodra applications. It analyzes a project and surfaces
insights about components, schemas, routes, and performance — with optional
AI enhancement — and ships a CLI exposed as `exo-introspect`.

## Installation

```bash
npm install --save-dev @exodra/introspect
```

## What it analyzes

- **Code & component analysis** — structure, patterns, complexity.
- **Performance analysis** — hotspots and optimization opportunities.
- **Schema & route analysis** — schema relationships and route structure.
- **Optional AI enhancement** — insights via configured AI providers.
- **Editor integration** — Cursor / Claude setup.

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

- `quick-check` — fast project health check (`-p, --path`).
- `analyze` — comprehensive analysis (`-p, --path`, `--ai`, `--provider`, `--model`, `--api-key`, `-f, --format`, `-o, --output`, `-v, --verbose`).
- `components` — analyze components for patterns and optimization (`-p, --path`, `-f, --format`).
- `performance` — analyze performance hotspots and bottlenecks (`-p, --path`).
- `schemas` — analyze schema definitions and relationships (`-p, --path`).
- `routes` — analyze routes and navigation structure (`-p, --path`).
- `explain <file>` — AI explanation of a code file (`--provider`, `--api-key`).
- `check-thresholds <file>` — check a saved analysis JSON against quality gates (`--max-errors`, `--max-warnings`, `--min-score`).
- `explore` — launch and explore the app in a browser with optional AI analysis (`--headless`, `--scenarios`, `--url`, `--ai`).
- `setup` — automatic AI ecosystem setup (`--interactive`, `--silent`, `--project-root`).
- `setup-cursor` — generate Cursor (Claude Code) integration (`-p, --path`).
- `ai providers` — list configured AI providers.
- `ai test` — test the AI provider connection (`--provider`).
- `plugins list` — list installed introspect plugins.

> There is no `report` command. To produce a report file, use `analyze -o <file>`
> (with `-f json|markdown|html`).

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
  scope: 'project', // 'file' | 'project' | 'workspace'
  enableAI: false,
  verbose: false,
});

// Format a result as json | markdown | html (default: json)
const markdown = formatResults(result, 'markdown');
console.log(markdown);
```

> There is no `analyze()` export. Use `introspect(...)` / `quickIntrospect(...)`.

## Other exports

Beyond the main API, the package exports:

- **Analyzer classes** — `SchemaAnalyzer`, `ComponentAnalyzer`,
  `PerformanceAnalyzer`, `CodeAnalyzer`, `ExoRouterAnalyzer`.
- **Engine** — `IntrospectionEngine`, plus the extensible
  `ExoExtensibleIntrospectionEngine`.
- **Plugin system** — `ExoPluginManager`, `ExoPluginDiscovery`, `exoRouterPlugin`.
- **Universal AI system** — `universalAI`, `ExoUniversalAI`,
  `ExoAIProviderRegistry`, `githubCopilotProvider`, `customAIProvider`.
- **ESLint plugin** — `eslintPlugin`.

## Links

- npm: [`@exodra/introspect`](https://www.npmjs.com/package/@exodra/introspect)
- GitHub: [`packages/introspect`](https://github.com/abaikov/exodra/tree/master/packages/introspect)
