import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// A MEASUREMENT IS OF `dist/`, NEVER OF `src/`, AND BOTH RUNNERS HAVE TO BE ABLE TO SAY SO.
//
// Every participant resolves `@exodra/*` to a package's BUILT output. An axis was once run to test
// a change that had landed in `packages/string/src` and not been built: the symbol the change
// introduced was absent from `packages/string/dist/index.js`, and the axis dutifully measured the
// previous code. Every row came back byte-identical to the run before it. That was caught only
// because identical-to-the-last-digit is not a shape real timings take — had the stale run drifted
// a single grain it would have read as an honest null result and gone into a published page.
//
// ONE BODY AND NOT TWO: `run-one-axis.js` refuses to RECORD against a stale build and
// `run-benchmarks-headless.js` refuses to PRINT one, and a second copy of this walk is how the two
// would come to disagree about what stale means.
export const staleExoDistPackages = (benchmarksDir) => {
    const packagesDir = join(benchmarksDir, '..');
    const out = [];
    for (const pkg of readdirSync(packagesDir, { withFileTypes: true })) {
        if (!pkg.isDirectory()) continue;
        const dist = join(packagesDir, pkg.name, 'dist', 'index.js');
        const src = join(packagesDir, pkg.name, 'src');
        if (!existsSync(dist) || !existsSync(src)) continue;
        const built = statSync(dist).mtimeMs;
        const newer = [];
        const walk = (dir) => {
            for (const e of readdirSync(dir, { withFileTypes: true })) {
                const full = join(dir, e.name);
                if (e.isDirectory()) walk(full);
                else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
                    if (statSync(full).mtimeMs > built) newer.push(relative(benchmarksDir, full));
                }
            }
        };
        walk(src);
        if (newer.length > 0) out.push({ pkg: pkg.name, built, newer });
    }
    return out;
};

/** The same report in both runners, so one habit of reading it serves both. */
export const printStaleExoDist = (stale, what) => {
    console.error(
        `\n✖ REFUSING TO ${what}: this suite measures \`dist/\`, and \`dist/\` is older than the\n` +
            '  source it would be taken as evidence for. The numbers would describe code that\n' +
            '  is no longer what the repository says it is.\n'
    );
    for (const s of stale) {
        console.error(
            `  ${s.pkg}: dist built ${new Date(s.built).toLocaleTimeString()}, ` +
                `${s.newer.length} newer source file(s), e.g. ${s.newer.slice(0, 3).join(', ')}`
        );
    }
};
