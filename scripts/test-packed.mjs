// Packed-package integration test.
//
// Verifies the EXACT published tarballs work end-to-end as a real consumer would:
//   1. `npm pack` the compiler + runtime packages.
//   2. Install those tarballs into a fresh temp project (real `npm install`).
//   3. Compile a fixture Exodra JSX app with the INSTALLED @exodra/babel-plugin-jsx.
//   4. Run the compiled app against the INSTALLED @exodra/core + @exodra/dom in
//      jsdom, and assert behaviour (static attrs, bindable → DOM, handler event).
//
// Catches packaging bugs the unit suite can't: wrong `main`/`exports`, missing
// files in `files`, or a package that doesn't resolve once installed.

import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// package dir → published name
const PKGS = [
    ['core', '@exodra/core'],
    ['reactivity-types', '@exodra/reactivity-types'],
    ['reactivity', '@exodra/reactivity'],
    ['jsx', '@exodra/jsx'],
    ['dom', '@exodra/dom'],
    ['forms', '@exodra/forms'],
    ['babel-plugin-jsx', '@exodra/babel-plugin-jsx'],
];

// The fixture runner — executes inside the temp project, resolving ONLY from its
// own node_modules (i.e. the installed tarballs).
const RUNNER = `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const pluginMod = require('@exodra/babel-plugin-jsx');
const plugin = pluginMod.default ?? pluginMod;
const { JSDOM } = require('jsdom');

const { window } = new JSDOM('<!doctype html><html><body></body></html>');
for (const k of ['Event','CustomEvent','MouseEvent','KeyboardEvent','FocusEvent','SubmitEvent','Node','Element','Text','Comment','DocumentFragment','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLButtonElement','requestAnimationFrame','cancelAnimationFrame']) {
  globalThis[k] = window[k];
}
globalThis.window = window;
globalThis.document = window.document;

function compile(src) {
  const jsx = babel.transformSync(src, {
    filename: 'app.tsx', babelrc: false, configFile: false,
    presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
    plugins: [['@babel/plugin-syntax-jsx', { throwIfNamespace: false }], [plugin, {}]],
  }).code;
  return babel.transformSync(jsx, {
    babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
}

const cjs = compile(\`
export function make(label, onClick) {
  return <button static={{ class: 'b' }} bindable={{ textContent: label }} handlers={{ onClick }} />;
}
\`);
const mod = { exports: {} };
new Function('require', 'module', 'exports', cjs)(require, mod, mod.exports);
const make = mod.exports.make;

const { mount } = require('@exodra/dom');
const { bindable } = require('@exodra/reactivity');
const assert = (c, m) => { if (!c) throw new Error('ASSERT FAILED: ' + m); };

const label = bindable('a');
let clicks = 0;
const container = document.createElement('div');
document.body.appendChild(container);
const { dispose } = mount(make(label, () => clicks++), container);

assert(container.querySelector('button.b'), 'static class rendered');
assert(container.querySelector('button').textContent === 'a', 'bindable initial value');
label.setValue('b');
assert(container.querySelector('button').textContent === 'b', 'bindable updated the DOM');
container.querySelector('button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(clicks === 1, 'handler fired on real event');
dispose();
console.log('  fixture app OK: static + bindable + handler, against installed tarballs');
`;

const work = mkdtempSync(join(tmpdir(), 'exo-packed-'));
let ok = false;
try {
    const tgz = {};
    for (const [dir, name] of PKGS) {
        const out = execSync(`npm pack --pack-destination "${work}"`, {
            cwd: join(ROOT, 'packages', dir),
            encoding: 'utf8',
        });
        tgz[name] = join(work, out.trim().split('\n').pop().trim());
        console.log(`packed ${name}`);
    }

    const app = join(work, 'app');
    mkdirSync(app);
    const deps = {};
    for (const [, name] of PKGS) deps[name] = `file:${tgz[name]}`;
    Object.assign(deps, {
        '@babel/core': '^7.24.0',
        '@babel/plugin-syntax-jsx': '^7.24.0',
        '@babel/preset-typescript': '^7.24.0',
        jsdom: '^27.0.0',
    });
    writeFileSync(
        join(app, 'package.json'),
        JSON.stringify({ name: 'packed-app', version: '1.0.0', private: true, dependencies: deps }, null, 2)
    );

    console.log('installing tarballs into a fresh project…');
    execSync('npm install --no-audit --no-fund --loglevel=error', { cwd: app, stdio: 'inherit' });

    writeFileSync(join(app, 'runner.mjs'), RUNNER);
    execSync('node runner.mjs', { cwd: app, stdio: 'inherit' });
    ok = true;
} finally {
    rmSync(work, { recursive: true, force: true });
}

if (!ok) process.exit(1);
console.log('\n✅ packed integration passed');
