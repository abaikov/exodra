#!/usr/bin/env node
/**
 * EVERY DOOR AN EXAMPLE PAGE CALLS ON THE WIRE HAS TO EXIST ON THE BACKEND.
 *
 * `check-docs` verifies imported NAMES and `check-doc-examples` compiles the fenced TypeScript in
 * the guides. Neither looks at `packages/examples/*.html`, which is a script tag in a plain page:
 * nothing imports it, no tsc sees it, and a deleted door leaves it silently dead until somebody
 * opens the page in a browser. That is how `c.bindChildren`, `c.bindList`, `c.bind` and `c.set`
 * survived on a page as working prose long after the vocabulary stopped having them.
 *
 * WHAT IT CHECKS, and the narrowness is deliberate: the wiring parameter in these pages is spelled
 * `c`, so `c.NAME(` is the whole pattern, and NAME must appear as a method on the DOM vocabulary.
 * A page that spells its parameter something else is not checked and says so, rather than passing
 * quietly — an unchecked page is reported as unchecked.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const VOCABULARY = join(root, 'packages/dom/src/dom/EXO_DOM_NODE_VOCABULARY.ts');
const EXAMPLES = join(root, 'packages/examples');

const source = readFileSync(VOCABULARY, 'utf8');
const doors = new Set();
for (const match of source.matchAll(/^\s{4}([a-zA-Z][\w]*)\s*(?:\(|<)/gm)) doors.add(match[1]);
if (doors.size < 10) {
    console.error(
        'check:example-pages: read only ' +
            doors.size +
            ' doors out of the vocabulary — the extraction is wrong, not the pages.'
    );
    process.exit(1);
}

const pages = readdirSync(EXAMPLES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(EXAMPLES, entry.name, 'index.html'))
    .filter((path) => existsSync(path));

/** What each `@exodra/*` package's own index exports, by name. */
const exportsOf = (pkg) => {
    const index = join(root, 'packages', pkg, 'src/index.ts');
    if (!existsSync(index)) return null;
    const names = new Set();
    const text = readFileSync(index, 'utf8');
    for (const match of text.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gm)) {
        for (const part of match[1].split(',')) {
            const name = part
                .trim()
                .split(/\s+as\s+/)
                .pop()
                ?.trim();
            if (name !== undefined && name !== '') names.add(name);
        }
    }
    return names;
};

/**
 * THE CHECK THAT WOULD HAVE CAUGHT THE WORST ONE, and neither of the two below can.
 *
 * Every name in escape-hatches was real and every door existed, and the page was still a blank
 * screen: `@exodra/core`'s `dist/index.js` imports `@exodra/context` by bare name, the import map
 * did not list it, and a specifier the browser cannot resolve fails the WHOLE module graph before
 * one line runs — no exception to catch, no boot message, nothing in the console.
 *
 * So an import map has to cover the TRANSITIVE names, not the ones the page types. This walks the
 * `dist/` of everything the map points at and refuses any `@exodra/*` specifier the map is missing.
 *
 * IT READS `dist/`, which is compiled output and can be absent or stale. Absent is reported as
 * SKIPPED and not as a pass: a gate that goes quiet when its subject is missing is the failure
 * mode three gates in this repository were found to have.
 */
const checkImportMapClosure = (page, html, short) => {
    const block = html.match(/<script\s+type="importmap"\s*>([\s\S]*?)<\/script>/);
    if (block === null) return 'no import map';

    let map;
    try {
        map = JSON.parse(block[1]).imports ?? {};
    } catch {
        console.error('check:example-pages: ' + short + ' has an import map that is not JSON.');
        return null;
    }

    const mapped = new Set(Object.keys(map));
    const seen = new Set();
    const queue = [];
    const missingDist = [];

    for (const [name, target] of Object.entries(map)) {
        if (!name.startsWith('@exodra/')) continue;
        const file = join(root, target.replace(/^\//, ''));
        if (!existsSync(file)) missingDist.push(target);
        else queue.push([name, file]);
    }
    if (missingDist.length > 0) {
        return 'SKIPPED — not built: ' + missingDist.join(', ');
    }

    let bad = false;
    while (queue.length > 0) {
        const [owner, file] = queue.pop();
        if (seen.has(file)) continue;
        seen.add(file);
        const text = readFileSync(file, 'utf8');
        for (const hit of text.matchAll(/from\s*['"](@exodra\/[\w-]+)['"]/g)) {
            const specifier = hit[1];
            if (mapped.has(specifier)) continue;
            console.error(
                'check:example-pages: ' +
                    short +
                    " does not map '" +
                    specifier +
                    "', which " +
                    owner +
                    "'s dist imports by bare name. The browser cannot resolve it and the whole " +
                    'module graph fails to link BEFORE the page runs — blank screen, empty console.'
            );
            bad = true;
        }
    }
    return bad ? null : 'import map closed over ' + seen.size + ' dist file(s)';
};

let failed = false;
let checked = 0;
for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    const closure = checkImportMapClosure(page, html, page.slice(root.length + 1));
    if (closure === null) failed = true;
    else if (closure !== 'no import map') {
        console.log('  ' + page.slice(root.length + 1) + ' — ' + closure);
    }

    // THE OTHER HALF OF A DEAD PAGE: a name that moved packages, or left them. A page that still
    // asks a package for it fails at load before a single door is called.
    for (const imported of html.matchAll(
        /import\s+\{([^}]*)\}\s+from\s+['"]@exodra\/([\w-]+)['"]/g
    )) {
        const pkg = imported[2];
        const available = exportsOf(pkg);
        if (available === null) continue;
        const missing = imported[1]
            .split(',')
            .map((part) => part.trim())
            .filter((name) => name !== '' && !available.has(name));
        if (missing.length > 0) {
            console.error(
                'check:example-pages: ' +
                    page.slice(root.length + 1) +
                    ' imports ' +
                    missing.join(', ') +
                    ' from @exodra/' +
                    pkg +
                    ', which does not export ' +
                    (missing.length === 1 ? 'it' : 'them') +
                    '.'
            );
            failed = true;
        }
    }

    const used = new Set();
    for (const match of html.matchAll(/\bc\.([a-zA-Z][\w]*)\s*\(/g)) used.add(match[1]);
    const short = page.slice(root.length + 1);
    if (used.size === 0) {
        console.log('  ' + short + ' — no `c.door(` calls, nothing to check');
        continue;
    }
    checked++;
    const dead = [...used].filter((name) => !doors.has(name)).sort();
    if (dead.length > 0) {
        console.error(
            'check:example-pages: ' +
                short +
                ' calls ' +
                dead.map((name) => 'c.' + name + '()').join(', ') +
                ' — not on the DOM vocabulary. The page cannot run.'
        );
        failed = true;
    } else {
        console.log('  ' + short + ' — ' + used.size + ' doors, all of them real');
    }
}

if (!failed) {
    console.log(
        'check:example-pages: ' +
            checked +
            ' page(s) call only doors the vocabulary has, out of ' +
            doors.size +
            ' it offers.'
    );
}
process.exit(failed ? 1 : 0);
