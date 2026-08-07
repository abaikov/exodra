/**
 * The order the packages must be published in, worked out rather than written down.
 *
 *   node scripts/publish-order.mjs        → one package directory per line
 *
 * A hand-kept list is a list that drifts: this repository had two of them, in
 * publish.sh and publish-dry.sh, and by the time anyone looked they disagreed
 * with each other AND with the packages on disk — one still named a directory
 * that had been renamed, both had a package missing. None of that can happen to
 * an order derived from the manifests themselves.
 *
 * Order matters because npm resolves what it is told: publishing a package
 * before the version of the workspace dependency it asks for is on the registry
 * gives everyone who installs it an unresolvable tree until the rest goes up.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES_DIR = 'packages';

/** Every publishable workspace package, by name. */
export function readPackages(root = '.') {
    const found = new Map();
    for (const entry of readdirSync(join(root, PACKAGES_DIR))) {
        const dir = join(PACKAGES_DIR, entry);
        const manifestPath = join(root, dir, 'package.json');
        if (!existsSync(manifestPath)) continue;

        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (manifest.private === true) continue;
        found.set(manifest.name, {
            dir,
            name: manifest.name,
            version: manifest.version,
            files: manifest.files ?? [],
            needs: [
                ...Object.keys(manifest.dependencies ?? {}),
                ...Object.keys(manifest.peerDependencies ?? {}),
            ],
        });
    }
    return found;
}

/**
 * Dependencies first.
 *
 * Depth-first, and deliberately tolerant of a cycle: two packages that depend on
 * each other are a problem for the architecture rules to report, not a reason
 * for the release to refuse to run.
 */
export function publishOrder(packages) {
    const order = [];
    const state = new Map();

    const visit = name => {
        if (state.get(name) === 'done' || state.get(name) === 'visiting') return;
        state.set(name, 'visiting');
        const pkg = packages.get(name);
        // Sorted so the order is the same on every machine and every run.
        for (const need of [...pkg.needs].sort()) {
            if (packages.has(need)) visit(need);
        }
        state.set(name, 'done');
        order.push(pkg);
    };

    for (const name of [...packages.keys()].sort()) visit(name);
    return order;
}

if (process.argv[1]?.endsWith('publish-order.mjs')) {
    for (const pkg of publishOrder(readPackages())) console.log(pkg.dir);
}
