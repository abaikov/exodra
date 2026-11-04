#!/usr/bin/env node
// release:check:clean — the CI run, on this machine, from a fresh state, and the only thing that
// may let a commit or a push through.
//
// 1. Records the tree that would be committed: every tracked and untracked, non-ignored file.
// 2. Deletes every build output (dist, .tsbuild, tsbuildinfo, compiled files under src) and
//    reinstalls dependencies with `npm ci`, so nothing a previous build left behind can hide a
//    step that only works when it is there.
// 3. Runs `npm run release:check`. `test:packed` runs in CI only, before it publishes.
// 4. Refuses if any check changed a file (the tree after must equal the tree before).
// 5. Writes `.release-check-pass` with that tree's hash. `.githooks/pre-commit` and `pre-push`
//    accept only a commit whose tree is exactly that hash.
import { execSync, spawn } from 'node:child_process';
import { existsSync, readdirSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const STAMP = join(ROOT, '.release-check-pass');

function workingTreeHash() {
    const index = join(mkdtempSync(join(tmpdir(), 'exo-tree-')), 'index');
    const env = { ...process.env, GIT_INDEX_FILE: index };
    execSync('git add -A', { cwd: ROOT, env, stdio: 'ignore' });
    const hash = execSync('git write-tree', { cwd: ROOT, env, encoding: 'utf8' }).trim();
    rmSync(index, { force: true });
    return hash;
}

// Each step runs in its own process group and Ctrl+C kills that group whole: a step-by-step chain
// otherwise reads an interrupted step as an ordinary failure, and the loops in it go on to the next.
let running = null;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
        if (running !== null && running.exitCode === null) process.kill(-running.pid, 'SIGKILL');
        console.error(`\n✖ release:check:clean — interrupted (${signal}). Nothing was stamped.`);
        process.exit(130);
    });
}

function run(label, command, args) {
    console.log(`\n▶ ${label}`);
    return new Promise((resolve) => {
        running = spawn(command, args, { cwd: ROOT, stdio: 'inherit', detached: true });
        running.on('exit', (status) => {
            running = null;
            if (status !== 0) {
                console.error(
                    `\n✖ release:check:clean — ${label} failed (exit ${status}). Nothing was stamped.`
                );
                process.exit(1);
            }
            resolve();
        });
    });
}

rmSync(STAMP, { force: true });
const before = workingTreeHash();
console.log(`release:check:clean — checking tree ${before}`);

const packages = join(ROOT, 'packages');
for (const entry of readdirSync(packages)) {
    for (const out of ['dist', '.tsbuild', 'tsconfig.tsbuildinfo']) {
        const path = join(packages, entry, out);
        if (existsSync(path)) rmSync(path, { recursive: true, force: true });
    }
}
await run('remove compiled files under src', 'npm', ['run', '--silent', 'clean:src']);
await run('npm ci', 'npm', ['ci', '--no-audit', '--no-fund']);
await run('npm run release:check', 'npm', ['run', 'release:check']);

const after = workingTreeHash();
if (after !== before) {
    console.error(
        '\n✖ release:check:clean — the checks changed files in the tree (generated data, formatting).\n' +
            '  Review the changes (`git status`), keep them, and run release:check:clean again.'
    );
    process.exit(1);
}
writeFileSync(STAMP, `${before}\n`);
console.log(
    `\n✓ release:check:clean — tree ${before} passed from a clean state; commit and push may use it.`
);
