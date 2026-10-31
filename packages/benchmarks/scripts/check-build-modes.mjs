// IS ANY PARTICIPANT STILL CARRYING A DEV-MODE TRANSFORM? THIS FILE IS THE ANSWER.
//
// WHY IT EXISTS. Twice now this suite has published numbers taken against a competitor's DEBUG
// build, and both times the reason was the same shape: the setting that selects a production build
// was left to somebody else's default, the default changed nothing visible, and nobody had a way to
// ask. React and Solid were measured on their development bundles for the suite's whole life. Then
// the fix that caught those — `process.env.NODE_ENV` as a Vite `define`, plus explicit
// `resolve.conditions` — turned out not to reach two more:
//
//   * SVELTE was compiled with `compilerOptions.hmr` ON. `svelte.config.js` said `dev: false` and
//     nothing else, and the plugin's default is `hmr: !isProduction && !isBuild && server.hmr !==
//     false`. `isProduction` is read from NODE_ENV IN THE NODE PROCESS, and this suite sets NODE_ENV
//     as a `define` — a client-side string replacement the Node process never sees. So every
//     `.svelte` participant carried `if (import.meta.hot) { App = $.hmr(App); … }` and lost the
//     `is_standalone` markup optimisation on every `{#if x}<Foo/>{/if}`.
//   * SOLID still had `solid-refresh` injected. `dev: false` picks the production RUNTIME; the
//     refresh BABEL PLUGIN is a separate switch (`options.hot`), gated on `command === 'serve' &&
//     mode !== 'production'`, and `mode` is Vite's own mode, which a `define` does not reach either.
//
// The common thread is that NODE_ENV is not a lever that reaches a plugin's own options, so a
// check built on NODE_ENV would rot the same way. This one reads what the toolchain actually
// PRODUCED — the transformed module bytes the browser will execute, the resolved compiler options
// the Svelte plugin recorded, and the dependency builds the optimiser picked — and nothing here
// asks any plugin what it intended.
//
// WHAT IT CHECKS, in three passes:
//
//   1. TRANSFORM OUTPUT. Every participant module is fetched from the running dev server, at the
//      URL the browser would use, and the returned JavaScript is searched for markers that only a
//      development transform emits. This is the pass that catches the two defects above.
//   2. THE SVELTE PLUGIN'S OWN RECORD. `node_modules/.vite/_svelte_metadata.json` is written by
//      vite-plugin-svelte on every dev start and holds its RESOLVED `compilerOptions`. It is the
//      plugin stating what it did, not us inferring it. That file once read
//      `{"dev":false,"hmr":true}` — which is how the Svelte defect was proved rather than argued.
//   3. DEPENDENCY BUILD SELECTION. `node_modules/.vite/deps/_metadata.json` names the file each
//      bare import resolved to, and the emitted `deps/*.js.map` name the upstream files esbuild
//      actually bundled. Between them they catch a package whose dev/prod split is an export
//      condition (solid-js, marko, uhtml, mikado) and one whose split is internal to a file
//      esbuild inlines (react, react-dom). Lit is neither: its development build carries the same
//      upstream sourcemap as its production build, so it is caught by a content marker instead.
//
// HOW TO RUN IT
//
//   npm run check:build-modes --workspace=@exodra/benchmarks
//
// That starts its own dev server, checks, and stops it. It is also called by
// `scripts/run-one-axis.js` immediately after that script starts its dev server, so every axis run
// answers the question before it measures anything. `--no-build-check` skips it there.
//
// DO NOT run the standalone form while a bench is running: both would share
// `node_modules/.vite/`, and the standalone form starts a second server on the same port.
//
// A NOTE ON THE MARKERS. They are matched against transformed output, and transformed output keeps
// source comments. If a participant ever grows a comment containing `solid-refresh` or
// `import.meta.hot`, this will fail on it. That is the correct trade: a false alarm costs one
// rename, a missed dev transform costs a published number.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, dirname, resolve as resolvePath, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(__dirname, '..');
const DEFAULT_PORT = 3001;

// ─────────────────────────────────────────────────────────────────────────────────────────────
// PASS 1 — MARKERS IN TRANSFORMED PARTICIPANT MODULES
//
// Each entry is a marker a DEVELOPMENT transform emits and a production one does not, with the
// configuration line that decides it. `why` is printed on failure so the reader is not sent
// hunting for the switch.
const TRANSFORM_MARKERS = [
    {
        applies: /\.svelte$/,
        label: 'svelte · HMR wrapper',
        bad: /import\.meta\.hot|\$\.hmr\(/,
        why:
            '`compilerOptions.hmr` in svelte.config.js. `dev: false` does NOT clear it — the ' +
            'plugin only clears hmr when vite `server.hmr === false` or when it believes it is ' +
            'building for production, and neither is true on this dev server. Set `hmr: false` ' +
            'beside `dev: false`.',
    },
    {
        applies: /\.svelte$/,
        label: 'svelte · dev instrumentation',
        bad: /\$\.FILENAME|\$\.add_locations|\$\.validate_/,
        why: '`compilerOptions.dev` in svelte.config.js must be false.',
    },
    {
        applies: /\.tsx$/,
        label: 'solid · solid-refresh',
        bad: /solid-refresh/,
        why:
            "vite-plugin-solid's `hot` option in vite.config.ts. `dev: false` only picks the " +
            'production RUNTIME; the refresh babel plugin is gated on `options.hot !== false`. ' +
            'Note this marker covers EVERY .tsx, not only Solid ones: the plugin transforms all ' +
            'of them, and solid-refresh wraps any top-level PascalCase function component it ' +
            'finds, whichever framework wrote it.',
    },
    {
        applies: /\.tsx$/,
        label: 'react · development JSX runtime',
        bad: /jsx-dev-runtime|jsxDEV/,
        why:
            'an automatic JSX transform running in development mode. The participants author ' +
            'React through `createElement` precisely so no per-framework JSX transform is in ' +
            'the path; a hit here means one appeared.',
    },
    {
        applies: /\.marko$/,
        label: 'marko · debug runtime',
        bad: /marko\/debug\//,
        why:
            '`optimize` in the marko() plugin in vite.config.ts. Marko\'s translator emits ' +
            '`marko/debug/dom` instead of `marko/dom` whenever `optimize` is not true.',
    },
];

// `.ts` participants are deliberately not fetched. vite-plugin-solid's transform returns early for
// anything that is not `.[mc]?[tj]sx`, so a `.ts` file cannot carry solid-refresh, and no other
// plugin in this config touches plain `.ts`. Fetching forty more modules to prove a negative the
// plugin's own guard already gives would only slow the gate down.
const PARTICIPANT_EXT = /\.(tsx|svelte|marko)$/;

function participantModules(rootDir) {
    const base = join(rootDir, 'src', 'benchmarks');
    const out = [];
    const walk = (dir) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, e.name);
            if (e.isDirectory()) walk(full);
            else if (PARTICIPANT_EXT.test(e.name)) {
                out.push('/' + relative(rootDir, full).split(sep).join('/'));
            }
        }
    };
    walk(base);
    return out.sort();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// PASS 3 — DEPENDENCY BUILD SELECTION
//
// (a) Entry resolution, from `_metadata.json`. `optimized[id].src` is the file the bare import
//     resolved to under this config's `resolve.conditions` / `optimizeDeps.esbuildOptions.
//     conditions`. `expect` is asserted as well as `forbid` so a rename upstream cannot make the
//     check pass by matching nothing.
const DEP_ENTRY_RULES = [
    // Packages whose dev and prod builds are DIFFERENT FILES chosen by an export condition. For
    // these the resolved path IS the verdict.
    { id: 'solid-js', forbid: /\/dist\/dev\.js$/, expect: /\/solid-js\/dist\/solid\.js$/ },
    { id: 'solid-js/web', forbid: /\/dev\.js$/, expect: /\/solid-js\/web\/dist\/web\.js$/ },
    { id: 'marko/dom', forbid: /\/debug\//, expect: /\/marko\/dist\/dom\.mjs$/ },
    { id: 'mikado', forbid: /debug/, expect: /\.min\.js$/ },
    { id: 'uhtml', forbid: /\/dist\/dev\//, expect: /\/uhtml\/dist\/prod\// },
    // Lit's ENTRY is the same file either way (`lit/index.js` has no development condition; the
    // split lives in the transitive lit-html and @lit/reactive-element). The path is pinned here
    // so an unexpected entry is still noticed; the actual dev/prod verdict comes from
    // DEP_CONTENT_FORBID below.
    { id: 'lit', forbid: /\/development\//, expect: /\/lit\/index\.js$/ },
    { id: 'lit/directives/repeat.js', forbid: /\/development\//, expect: /\/lit\/directives\// },
    // NO DEV/PROD SPLIT EXISTS in these packages — checked against each package.json:
    // sinuous and stage0 publish one build and no conditions at all; voby maps `./jsx-dev-runtime`
    // to the SAME file as `./jsx-runtime`; oby publishes one build; svelte ships source and gates
    // its warnings on `DEV` from esm-env rather than on a second copy of the runtime. They are
    // listed anyway because the rules below assert PRESENCE, and a participant silently dropping
    // out of the dep cache is itself worth a refusal.
    { id: 'svelte', forbid: /\/dev\//, expect: /\/svelte\/src\// },
    { id: 'sinuous', forbid: /\/dev\//, expect: /\/sinuous\// },
    { id: 'stage0', forbid: /\/dev\//, expect: /\/stage0\// },
    { id: 'voby', forbid: /\/dev\//, expect: /\/voby\// },
    { id: 'oby', forbid: /\/dev\//, expect: /\/oby\// },
];

// (b) What esbuild actually inlined, from the emitted sourcemaps. This is the only pass that sees
//     inside a dependency whose dev/prod split is a `process.env.NODE_ENV` branch in a file the
//     bundler follows — react and react-dom pick their build that way, and their entry path is
//     `react/index.js` either way, so (a) cannot tell them apart.
//
//     REQUIRED, not merely not-forbidden: a check that only forbids passes when the package is
//     absent, and absence is exactly what a broken dep cache looks like.
const DEP_SOURCE_FORBID = [
    { re: /\/react\/cjs\/react[.\w-]*\.development\.js$/, label: 'react · development bundle' },
    {
        re: /\/react-dom\/cjs\/react-dom[.\w-]*\.development\.js$/,
        label: 'react-dom · development bundle',
    },
    { re: /\/solid-js\/(?:dist|web\/dist)\/dev\.js$/, label: 'solid-js · dev build' },
    { re: /\/(?:lit-html|lit-element|reactive-element)\/development\//, label: 'lit · dev build' },
    { re: /\/marko\/dist\/debug\//, label: 'marko · debug runtime' },
    { re: /\/uhtml\/dist\/dev\//, label: 'uhtml · dev build' },
];
const DEP_SOURCE_REQUIRE = [
    { re: /\/react\/cjs\/react\.production\.js$/, label: 'react · production bundle' },
    { re: /\/react-dom\/cjs\/react-dom\.production\.js$/, label: 'react-dom · production bundle' },
    {
        re: /\/react-dom\/cjs\/react-dom-client\.production\.js$/,
        label: 'react-dom/client · production bundle',
    },
];

// (c) Lit is caught by neither of the above. Its development build ships the SAME upstream
//     sourcemap as its production build — both name `lit-html/src/lit-html.ts` — so the emitted
//     `sources` cannot distinguish them, and its entry (`lit/index.js`) has no development
//     condition because the split lives in the transitive `lit-html` / `@lit/reactive-element`.
//     These strings appear 36 and 3 times in those packages' `development/` builds and zero times
//     in the shipped production ones (checked).
const DEP_CONTENT_FORBID = [
    { re: /Lit is in dev mode/, label: 'lit · dev-mode runtime' },
    { re: /debugLogEvent/, label: 'lit · dev-mode debug logging' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return null;
    }
}

// `_metadata.json` stores `src`/`file` RELATIVE to the deps cache directory (Vite's
// `stringifyDepsOptimizerMetadata` rewrites them on the way out), so they are joined back before
// matching. Kept as forward-slash text: every rule above is written in POSIX form.
function normaliseSrc(depsDir, src) {
    return join(depsDir, src).split(sep).join('/');
}

/**
 * @param {{ rootDir?: string, baseUrl?: string }} opts
 * @returns {Promise<{ checks: Array<{level: string, label: string, subject: string, detail: string}>,
 *                     failures: number }>}
 */
export async function checkBuildModes(opts = {}) {
    const rootDir = opts.rootDir ?? DEFAULT_ROOT;
    const baseUrl = opts.baseUrl ?? `http://localhost:${DEFAULT_PORT}`;
    const checks = [];
    const pass = (label, subject, detail = '') =>
        checks.push({ level: 'pass', label, subject, detail });
    const fail = (label, subject, detail) => checks.push({ level: 'fail', label, subject, detail });

    // ── PASS 1 ────────────────────────────────────────────────────────────────────────────────
    //
    // Fetched a few at a time rather than one after another: each of these is a full babel or
    // svelte compile on the server side, there are dozens, and a gate that takes a minute is a
    // gate somebody turns off. The results are re-ordered back into module order afterwards so a
    // failure list reads the same on every run.
    const modules = participantModules(rootDir);
    const CONCURRENCY = 8;
    const verdicts = new Array(modules.length);
    const inspect = async (i) => {
        const url = modules[i];
        let code;
        try {
            const res = await fetch(`${baseUrl}${url}`);
            code = await res.text();
            if (!res.ok) {
                verdicts[i] = [
                    [
                        'fail',
                        'transform',
                        url,
                        `dev server returned ${res.status} — the module could not be ` +
                            `transformed, so nothing about it is verified.\n      ` +
                            `${code.split('\n')[0]}`,
                    ],
                ];
                return;
            }
        } catch (e) {
            verdicts[i] = [
                ['fail', 'transform', url, `could not be fetched from ${baseUrl}: ${e.message}`],
            ];
            return;
        }
        const found = [];
        for (const m of TRANSFORM_MARKERS) {
            if (!m.applies.test(url)) continue;
            const hit = m.bad.exec(code);
            if (hit !== null) {
                found.push([
                    'fail',
                    m.label,
                    url,
                    `transformed output contains \`${hit[0]}\`.\n      ${m.why}`,
                ]);
            }
        }
        verdicts[i] = found.length > 0 ? found : [['pass', 'transform', url, '']];
    };
    for (let i = 0; i < modules.length; i += CONCURRENCY) {
        await Promise.all(
            modules.slice(i, i + CONCURRENCY).map((_, k) => inspect(i + k))
        );
    }
    for (const group of verdicts) {
        for (const [level, label, subject, detail] of group ?? []) {
            checks.push({ level, label, subject, detail });
        }
    }

    // ── PASS 2 ────────────────────────────────────────────────────────────────────────────────
    const sveltePath = join(rootDir, 'node_modules', '.vite', '_svelte_metadata.json');
    const svelteMeta = readJson(sveltePath);
    if (svelteMeta === null) {
        fail(
            'svelte · resolved options',
            '_svelte_metadata.json',
            'missing or unreadable. vite-plugin-svelte writes it on every dev start, so its ' +
                'absence means the dev server this check was pointed at is not the one that ' +
                'compiles Svelte. Start the dev server and re-run.'
        );
    } else {
        const co = svelteMeta.compilerOptions ?? {};
        // Asserted as literal `false`, not merely "not true". These are the RESOLVED options, so
        // the plugin has already merged its defaults in; anything other than false means the value
        // came from a default rather than from svelte.config.js — which is the exact failure mode
        // this whole file exists for.
        for (const key of ['dev', 'hmr']) {
            if (co[key] === false) {
                pass('svelte · resolved options', `compilerOptions.${key}`, 'false');
            } else {
                fail(
                    'svelte · resolved options',
                    `compilerOptions.${key}`,
                    `resolved to ${JSON.stringify(co[key])}, not false. This is the plugin's own ` +
                        `record of what it compiled with. Set \`${key}: false\` in ` +
                        `svelte.config.js and delete node_modules/.vite so the cache is rebuilt.`
                );
            }
        }
    }

    // ── PASS 3 ────────────────────────────────────────────────────────────────────────────────
    const depsDir = join(rootDir, 'node_modules', '.vite', 'deps');
    const depsMetaPath = join(depsDir, '_metadata.json');

    // The fetches above force any not-yet-seen dependency to be discovered, and Vite writes the
    // metadata again when it re-optimises. Poll rather than read once, so a cold cache reports the
    // truth instead of reporting nothing.
    let depsMeta = null;
    const deadline = Date.now() + 20000;
    for (;;) {
        depsMeta = readJson(depsMetaPath);
        if (depsMeta !== null && depsMeta.optimized !== undefined) break;
        if (Date.now() > deadline) break;
        await sleep(250);
    }

    if (depsMeta === null) {
        fail(
            'dependency builds',
            'deps/_metadata.json',
            'not written within 20s. The optimiser has not run, so which build of each ' +
                'dependency is being served is unknown. Delete node_modules/.vite and start the ' +
                'dev server once.'
        );
    } else {
        const optimized = depsMeta.optimized ?? {};
        for (const rule of DEP_ENTRY_RULES) {
            const entry = optimized[rule.id];
            if (entry === undefined) {
                fail(
                    'dependency builds',
                    rule.id,
                    'absent from the dep cache, so its build was not verified. A rule that only ' +
                        'forbids passes vacuously when the package is missing, which is why this ' +
                        'is a failure and not a skip.'
                );
                continue;
            }
            const src = normaliseSrc(depsDir, entry.src);
            if (rule.forbid.test(src)) {
                fail('dependency builds', rule.id, `resolved to a development build: ${src}`);
            } else if (rule.expect !== undefined && !rule.expect.test(src)) {
                fail(
                    'dependency builds',
                    rule.id,
                    `resolved to ${src}, which is neither the expected production build ` +
                        `(${rule.expect}) nor a known development one. Unrecognised — verify by ` +
                        'hand and update DEP_ENTRY_RULES.'
                );
            } else {
                pass('dependency builds', rule.id, src);
            }
        }
    }

    if (!existsSync(depsDir)) {
        fail('dependency contents', 'deps/', 'the dep cache directory does not exist.');
    } else {
        const files = readdirSync(depsDir);
        const seenSources = new Set();
        const contentHits = [];
        for (const f of files) {
            const full = join(depsDir, f);
            if (f.endsWith('.js.map')) {
                // Only the `sources` array is wanted; `sourcesContent` follows it and is most of
                // the bytes. Matched with a regex rather than JSON.parse for that reason.
                const text = readFileSync(full, 'utf8');
                const m = /"sources"\s*:\s*\[([^\]]*)\]/.exec(text);
                if (m === null) continue;
                for (const raw of m[1].split(',')) {
                    const s = raw.trim().replace(/^"|"$/g, '');
                    if (s !== '') seenSources.add(s.split(sep).join('/'));
                }
            } else if (f.endsWith('.js')) {
                const text = readFileSync(full, 'utf8');
                for (const rule of DEP_CONTENT_FORBID) {
                    if (rule.re.test(text)) contentHits.push({ file: f, label: rule.label });
                }
            }
        }
        for (const rule of DEP_SOURCE_FORBID) {
            const hits = [...seenSources].filter((s) => rule.re.test(s));
            if (hits.length > 0) {
                fail('dependency builds', rule.label, `bundled into deps/: ${hits.join(', ')}`);
            } else {
                pass('dependency builds', rule.label, 'absent');
            }
        }
        for (const rule of DEP_SOURCE_REQUIRE) {
            const hits = [...seenSources].filter((s) => rule.re.test(s));
            if (hits.length > 0) pass('dependency builds', rule.label, hits[0]);
            else {
                fail(
                    'dependency builds',
                    rule.label,
                    'NOT found in any deps/*.js.map. Either the package is not being bundled at ' +
                        'all, or it is being bundled from a file this check does not recognise. ' +
                        'Both mean the production build is unproven.'
                );
            }
        }
        if (contentHits.length > 0) {
            for (const h of contentHits) {
                fail(
                    'dependency builds',
                    h.label,
                    `dev-only code found in deps/${h.file}. Lit's dev and prod builds share an ` +
                        'upstream sourcemap, so this content marker is the only thing that tells ' +
                        'them apart.'
                );
            }
        } else {
            pass('dependency builds', 'lit · dev-mode markers', 'absent from every deps/*.js');
        }
    }

    return { checks, failures: checks.filter((c) => c.level === 'fail').length };
}

export function printBuildModeReport(result, { verbose = false, log = console.log } = {}) {
    const fails = result.checks.filter((c) => c.level === 'fail');
    if (verbose) {
        for (const c of result.checks) {
            if (c.level !== 'pass') continue;
            log(`  ✅ ${c.label.padEnd(28)} ${c.subject}${c.detail ? `  → ${c.detail}` : ''}`);
        }
    }
    for (const c of fails) {
        log(`  ❌ ${c.label} — ${c.subject}\n      ${c.detail}`);
    }
    const n = result.checks.length;
    log(
        fails.length === 0
            ? `  ✅ build modes: ${n} checks, no development transform found`
            : `  ❌ build modes: ${fails.length} of ${n} checks FAILED`
    );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// STANDALONE FORM. `run-one-axis.js` imports the two functions above and drives them against the
// server it already started; run directly, this starts one of its own so the check can be asked
// as a question on its own.
function startVite(rootDir) {
    return new Promise((resolve, reject) => {
        const proc = spawn('npm', ['run', 'dev'], {
            cwd: rootDir,
            shell: true,
            stdio: 'pipe',
            env: { ...process.env, BROWSER: 'none' },
        });
        let ready = false;
        proc.stdout.on('data', (d) => {
            const s = d.toString();
            if (!ready && (s.includes('Local:') || s.includes('http://localhost'))) {
                ready = true;
                setTimeout(() => resolve(proc), 2000);
            }
        });
        proc.on('error', reject);
        setTimeout(() => {
            if (!ready) reject(new Error('vite did not become ready within 30s'));
        }, 30000);
    });
}

const invokedDirectly =
    process.argv[1] !== undefined &&
    resolvePath(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
    const verbose = !process.argv.includes('--quiet');
    console.log('🔎 checking participant build modes (starting a dev server)…');
    let proc = null;
    let code = 0;
    try {
        proc = await startVite(DEFAULT_ROOT);
        const result = await checkBuildModes({});
        printBuildModeReport(result, { verbose });
        code = result.failures === 0 ? 0 : 1;
    } catch (e) {
        console.error(`✖ ${e.message}`);
        code = 2;
    } finally {
        if (proc !== null) proc.kill('SIGTERM');
    }
    process.exit(code);
}
