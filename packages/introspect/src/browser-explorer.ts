/**
 * Browser-based exploration: launch the app in a real browser, measure it, and
 * report only what was actually observed.
 *
 * Playwright is an OPTIONAL peer dependency — it is imported lazily and its
 * absence is a loud error, never a fake success. The structural types below are
 * declared locally on purpose: the published `.d.ts` must not reference a package
 * consumers may not have installed.
 */

import { spawn, type ChildProcess } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export interface ExplorationConfig {
  baseUrl?: string;
  headless?: boolean;
  autoCapture?: boolean;
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  /** Selectors to click, in order. Empty = auto-discover buttons and links. */
  scenarios?: string[];
  /** Command that serves the app. Set to null to attach to an already-running server. */
  devCommand?: string | null;
  /** How long to wait for the dev server to answer, ms. */
  serverTimeoutMs?: number;
  /** Where screenshots are written. */
  screenshotDir?: string;
}

export interface ExplorationResult {
  screenshots: string[];
  componentTree: ComponentTreeNode[];
  performance: PerformanceMetrics;
  interactions: UserInteraction[];
  insights: ExplorationInsight[];
}

/**
 * A node of the RENDERED tree with its layout box. This is the DOM as the browser
 * built it — not an Exodra component tree, which would need a runtime hook the
 * renderer deliberately does not ship.
 */
export interface ComponentTreeNode {
  type: string;
  props: Record<string, string | number | boolean>;
  children: ComponentTreeNode[];
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PerformanceMetrics {
  /** navigationStart → loadEventEnd, ms. */
  loadTime: number;
  /** First Contentful Paint, ms. -1 when the browser reported no paint entry. */
  renderTime: number;
  /** JS heap after load, MB. -1 when the browser exposes no memory API. */
  memoryUsage: number;
  /** Transferred bytes of scripts, KB. */
  bundleSize: number;
}

export interface UserInteraction {
  type: 'click' | 'input' | 'scroll' | 'navigate';
  target: string;
  timestamp: number;
  result: string | number | boolean | null;
}

export interface ExplorationInsight {
  type: 'performance' | 'accessibility' | 'usability' | 'security';
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion: string;
}

/** Thrown when exploration cannot run. Never swallowed into a "successful" result. */
export class ExplorationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExplorationUnavailableError';
  }
}

// --- minimal structural view of the slice of Playwright we use -----------------

interface PwBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface PwResponse {
  url(): string;
  request(): { resourceType(): string };
  headerValue(name: string): Promise<string | null>;
}
interface PwPage {
  goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  evaluate<T>(fn: string): Promise<T>;
  screenshot(opts: { fullPage?: boolean }): Promise<Buffer>;
  on(event: 'response', cb: (r: PwResponse) => void): void;
  locator(selector: string): {
    count(): Promise<number>;
    first(): {
      click(opts?: { timeout?: number }): Promise<void>;
      boundingBox(): Promise<PwBoundingBox | null>;
    };
  };
  waitForTimeout(ms: number): Promise<void>;
  url(): string;
}
interface PwBrowser {
  newPage(): Promise<PwPage>;
  close(): Promise<void>;
}
interface PwChromium {
  launch(opts: { headless?: boolean; args?: string[] }): Promise<PwBrowser>;
}

const DEFAULTS: Required<
  Pick<
    ExplorationConfig,
    'baseUrl' | 'headless' | 'autoCapture' | 'analysisDepth' | 'serverTimeoutMs' | 'screenshotDir'
  >
> = {
  baseUrl: 'http://localhost:3000',
  headless: true,
  autoCapture: true,
  analysisDepth: 'basic',
  serverTimeoutMs: 60_000,
  screenshotDir: '.exodra/exploration',
};

// Collected in-page. Kept as a string so it does not need the DOM lib at build time.
const COLLECT_TREE = (maxDepth: number, maxNodes: number): string => `(() => {
  let budget = ${maxNodes};
  const walk = (el, depth) => {
    if (budget-- <= 0 || depth > ${maxDepth}) return null;
    const r = el.getBoundingClientRect();
    const props = {};
    for (const a of el.attributes) props[a.name] = a.value;
    const children = [];
    for (const child of el.children) {
      const node = walk(child, depth + 1);
      if (node) children.push(node);
    }
    return {
      type: el.tagName.toLowerCase(),
      props,
      children,
      location: { x: r.x, y: r.y, width: r.width, height: r.height },
    };
  };
  const root = document.body.firstElementChild;
  return root ? [walk(root, 0)].filter(Boolean) : [];
})()`;

const COLLECT_PERF = `(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  const mem = performance.memory;
  return {
    loadTime: nav ? Math.round(nav.loadEventEnd) : -1,
    renderTime: fcp ? Math.round(fcp.startTime) : -1,
    memoryUsage: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(2) : -1,
  };
})()`;

const COLLECT_A11Y = `(() => ({
  imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
  buttonsWithoutLabel: [...document.querySelectorAll('button')].filter(
    b => !b.textContent.trim() && !b.getAttribute('aria-label')
  ).length,
  hasTitle: !!document.title.trim(),
  hasLang: !!document.documentElement.lang,
}))()`;

const AUTO_TARGETS = 'button, a[href], [role="button"]';

export class ExodraBrowserExplorer {
  private config: ExplorationConfig;
  private projectRoot: string;
  private browser: PwBrowser | null = null;
  private server: ChildProcess | null = null;

  constructor(projectRoot: string, config: ExplorationConfig = {}) {
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULTS, ...config };
  }

  /**
   * Launch the app, drive it, and return what was measured.
   *
   * @throws ExplorationUnavailableError when Playwright is missing or the dev
   * server never becomes reachable — the caller must surface that, not print a
   * success banner over invented numbers.
   */
  async explore(): Promise<ExplorationResult> {
    const chromium = await this.loadChromium();
    const baseUrl = this.config.baseUrl ?? DEFAULTS.baseUrl;

    await this.ensureServer(baseUrl);

    this.browser = await chromium.launch({
      headless: this.config.headless ?? true,
      // usedJSHeapSize is coarse without this flag.
      args: ['--enable-precise-memory-info'],
    });
    const page = await this.browser.newPage();

    // Script bytes actually transferred, summed as they arrive.
    let scriptBytes = 0;
    const pending: Array<Promise<void>> = [];
    page.on('response', response => {
      if (response.request().resourceType() !== 'script') return;
      pending.push(
        response
          .headerValue('content-length')
          .then(len => {
            const n = Number(len);
            if (Number.isFinite(n)) scriptBytes += n;
          })
          .catch(() => undefined)
      );
    });

    await page.goto(baseUrl, { waitUntil: 'load', timeout: 30_000 });
    await Promise.all(pending);

    const perfRaw = await page.evaluate<{
      loadTime: number;
      renderTime: number;
      memoryUsage: number;
    }>(COLLECT_PERF);

    const performance: PerformanceMetrics = {
      ...perfRaw,
      bundleSize: +(scriptBytes / 1024).toFixed(1),
    };

    const depth = this.config.analysisDepth ?? 'basic';
    const limits = {
      basic: { maxDepth: 4, maxNodes: 200 },
      detailed: { maxDepth: 8, maxNodes: 1000 },
      comprehensive: { maxDepth: 24, maxNodes: 10_000 },
    }[depth];
    const componentTree = await page.evaluate<ComponentTreeNode[]>(
      COLLECT_TREE(limits.maxDepth, limits.maxNodes)
    );

    const screenshots: string[] = [];
    if (this.config.autoCapture ?? true) {
      screenshots.push(await this.capture(page, 'initial'));
    }

    const interactions = await this.runScenarios(page);

    if ((this.config.autoCapture ?? true) && interactions.length > 0) {
      screenshots.push(await this.capture(page, 'after-interactions'));
    }

    const a11y = await page.evaluate<{
      imagesWithoutAlt: number;
      buttonsWithoutLabel: number;
      hasTitle: boolean;
      hasLang: boolean;
    }>(COLLECT_A11Y);

    return {
      screenshots,
      componentTree,
      performance,
      interactions,
      insights: this.deriveInsights(performance, componentTree, interactions, a11y),
    };
  }

  /** Close the browser and stop a dev server we started. Safe to call twice. */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
    if (this.server) {
      this.server.kill('SIGTERM');
      this.server = null;
    }
  }

  // --- internals -------------------------------------------------------------

  private async loadChromium(): Promise<PwChromium> {
    try {
      const mod = (await import('playwright')) as unknown as { chromium: PwChromium };
      if (!mod?.chromium) throw new Error('no chromium export');
      return mod.chromium;
    } catch {
      throw new ExplorationUnavailableError(
        'Browser exploration needs Playwright, which is an optional peer dependency.\n' +
          '  npm i -D playwright && npx playwright install chromium'
      );
    }
  }

  /**
   * Reachable already? Attach. Otherwise start `devCommand` and POLL until the URL
   * answers. (Never `execSync` a dev server — it does not exit, so the call would
   * block forever.)
   */
  private async ensureServer(baseUrl: string): Promise<void> {
    if (await this.ping(baseUrl)) return;

    const command = this.config.devCommand === undefined ? 'npm run dev' : this.config.devCommand;
    if (!command) {
      throw new ExplorationUnavailableError(
        `Nothing is serving ${baseUrl} and no dev command was configured.`
      );
    }

    this.server = spawn(command, {
      cwd: this.projectRoot,
      shell: true,
      stdio: 'ignore',
      env: { ...process.env, BROWSER: 'none' },
    });

    const deadline = Date.now() + (this.config.serverTimeoutMs ?? DEFAULTS.serverTimeoutMs);
    while (Date.now() < deadline) {
      if (await this.ping(baseUrl)) return;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    await this.cleanup();
    throw new ExplorationUnavailableError(
      `Started \`${command}\` but ${baseUrl} did not answer within ` +
        `${Math.round((this.config.serverTimeoutMs ?? DEFAULTS.serverTimeoutMs) / 1000)}s.`
    );
  }

  private async ping(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      return response.ok || response.status < 500;
    } catch {
      return false;
    }
  }

  private async capture(page: PwPage, label: string): Promise<string> {
    const dir = join(this.projectRoot, this.config.screenshotDir ?? DEFAULTS.screenshotDir);
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${label}.png`);
    await writeFile(file, await page.screenshot({ fullPage: true }));
    return file;
  }

  private async runScenarios(page: PwPage): Promise<UserInteraction[]> {
    const explicit = this.config.scenarios ?? [];
    const selectors = explicit.length > 0 ? explicit : [AUTO_TARGETS];
    const interactions: UserInteraction[] = [];
    // Auto-discovery clicks the first match only — a blind sweep over every button
    // in an unknown app is as likely to log the user out as to exercise anything.
    const budget = explicit.length > 0 ? explicit.length : 1;

    for (const selector of selectors.slice(0, budget)) {
      const locator = page.locator(selector);
      let result: string | number | boolean | null = null;
      try {
        if ((await locator.count()) === 0) {
          result = 'no match';
        } else {
          const before = page.url();
          await locator.first().click({ timeout: 5000 });
          await page.waitForTimeout(150);
          result = page.url() !== before ? `navigated to ${page.url()}` : true;
        }
      } catch (error) {
        result = `failed: ${(error as Error).message.split('\n')[0]}`;
      }
      interactions.push({
        type: 'click',
        target: selector,
        timestamp: Date.now(),
        result,
      });
    }
    return interactions;
  }

  /** Insights are DERIVED from the numbers above — none are hardcoded. */
  private deriveInsights(
    performance: PerformanceMetrics,
    tree: ComponentTreeNode[],
    interactions: UserInteraction[],
    a11y: {
      imagesWithoutAlt: number;
      buttonsWithoutLabel: number;
      hasTitle: boolean;
      hasLang: boolean;
    }
  ): ExplorationInsight[] {
    const insights: ExplorationInsight[] = [];

    if (performance.loadTime > 3000) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        message: `Load took ${performance.loadTime}ms.`,
        suggestion: 'Check what blocks load — usually render-blocking scripts or an oversized bundle.',
      });
    }
    if (performance.renderTime > 2500) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        message: `First Contentful Paint at ${performance.renderTime}ms.`,
        suggestion: 'Server-render the first screen, or split the entry bundle.',
      });
    }
    if (performance.bundleSize > 500) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        message: `${performance.bundleSize}KB of script transferred.`,
        suggestion: 'Code-split routes and lazy-load what is not on the first screen.',
      });
    }

    let nodes = 0;
    const count = (list: ComponentTreeNode[]): void => {
      for (const node of list) {
        nodes += 1;
        count(node.children);
      }
    };
    count(tree);
    if (nodes > 1500) {
      insights.push({
        type: 'performance',
        severity: 'info',
        message: `${nodes} elements in the captured tree.`,
        suggestion: 'Large trees cost layout time — virtualize long lists.',
      });
    }

    if (a11y.imagesWithoutAlt > 0) {
      insights.push({
        type: 'accessibility',
        severity: 'warning',
        message: `${a11y.imagesWithoutAlt} image(s) without an alt attribute.`,
        suggestion: 'Add alt text, or alt="" if the image is decorative.',
      });
    }
    if (a11y.buttonsWithoutLabel > 0) {
      insights.push({
        type: 'accessibility',
        severity: 'warning',
        message: `${a11y.buttonsWithoutLabel} button(s) with no text and no aria-label.`,
        suggestion: 'Give every control an accessible name.',
      });
    }
    if (!a11y.hasTitle) {
      insights.push({
        type: 'accessibility',
        severity: 'error',
        message: 'The document has no <title>.',
        suggestion: 'Set a title — screen readers and tabs both rely on it.',
      });
    }
    if (!a11y.hasLang) {
      insights.push({
        type: 'accessibility',
        severity: 'warning',
        message: 'The <html> element has no lang attribute.',
        suggestion: 'Set lang so assistive tech picks the right pronunciation.',
      });
    }

    const failed = interactions.filter(
      i => typeof i.result === 'string' && i.result.startsWith('failed:')
    );
    if (failed.length > 0) {
      insights.push({
        type: 'usability',
        severity: 'warning',
        message: `${failed.length} scenario(s) could not be clicked.`,
        suggestion: 'Check the selectors, or whether the control is covered or disabled.',
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'performance',
        severity: 'info',
        message: 'No threshold was exceeded in this run.',
        suggestion: 'Re-run with --scenarios to exercise specific flows.',
      });
    }
    return insights;
  }
}
