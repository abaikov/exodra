/**
 * Does the published page actually work in a browser?
 *
 *   node packages/monorepo-atlas/scripts/smoke.mjs [url]
 *
 * Everything else in this package is tested in jsdom, which is enough for
 * logic and wrong for the thing that kept breaking: whether the artefacts load,
 * whether the SVG paints, whether the console is clean. Those need a real
 * browser, and checking them by hand is how broken pages get shipped.
 *
 * Playwright is already a devDependency of this repository — the benchmarks
 * drive it — so this costs nothing new.
 */
import { chromium } from 'playwright';

const url =
    process.argv[2] ?? 'http://localhost:3300/docs/architecture/dependency-graph';
const failures = [];
const check = (ok, description, detail = '') => {
    if (!ok) failures.push(`${description}${detail ? ` — ${detail}` : ''}`);
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${description}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const consoleErrors = [];
page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', error => consoleErrors.push(error.message));

await page.goto(url, { waitUntil: 'networkidle' });

// ── the package graph ────────────────────────────────────────────────────────
const svg = page.locator('.exo-graph-canvas');
await svg.waitFor({ timeout: 15000 }).catch(() => {});
check(await svg.count() > 0, 'the drawing is there');

const nodes = await page.locator('.exo-node-group').count();
check(nodes > 10, 'it has packages in it', `${nodes} nodes`);
check(
    (await page.locator('path[data-edge]').count()) > 10,
    'it has dependencies in it'
);

// The whole drawing is in view on arrival — an overview, deliberately smaller
// than life. Legibility then comes from being able to zoom, which is checked
// below; a fixed scale would have to choose between the two and fail one.
const scaleOf = async () => {
    const transform = await page
        .locator('.exo-graph-viewport')
        .getAttribute('transform');
    return Number(/scale\(([\d.]+)\)/.exec(transform ?? '')?.[1] ?? 0);
};
const fitted = await scaleOf();
check(fitted > 0.2, 'it opens with the whole graph in view', `scale ${fitted.toFixed(2)}`);

// ── the host's colours win ───────────────────────────────────────────────────
const colours = await page.evaluate(() => {
    const el = document.querySelector('.exo-graph');
    const styles = getComputedStyle(el);
    return {
        runtime: styles.getPropertyValue('--exo-kind-runtime').trim(),
        primary: getComputedStyle(document.documentElement)
            .getPropertyValue('--ifm-color-primary')
            .trim(),
    };
});
check(
    colours.runtime === colours.primary,
    "the host's colours win over the library defaults",
    `${colours.runtime} vs ${colours.primary}`
);

// The site has a fixed navbar; bring the graph clear of it before touching it.
await page.locator('.exo-graph-stage').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

// A trackpad pinch — which every platform delivers as ctrl+wheel with small
// numbers. It has to move the zoom by a useful amount: too little and the
// gesture feels dead, too much and it slams into the limits.
const pinchBox = await page.locator('.exo-graph-stage').boundingBox();
const beforePinch = await scaleOf();
await page.evaluate(
    ({ x, y }) => {
        const stage = document.querySelector('.exo-graph-stage');
        for (let i = 0; i < 10; i++) {
            stage.dispatchEvent(
                new WheelEvent('wheel', {
                    deltaY: -4,
                    ctrlKey: true,
                    clientX: x,
                    clientY: y,
                    bubbles: true,
                    cancelable: true,
                })
            );
        }
    },
    { x: pinchBox.x + pinchBox.width / 2, y: pinchBox.y + pinchBox.height / 2 }
);
await page.waitForTimeout(150);
const afterPinch = await scaleOf();
const pinchRatio = afterPinch / beforePinch;
check(
    pinchRatio > 1.3 && pinchRatio < 3,
    'a pinch zooms by a useful amount',
    `×${pinchRatio.toFixed(2)}`
);

// The scale must be continuous: rounding it to a tenth turns a slow pinch into
// nothing followed by a jump, which is what a broken zoom feels like.
const transformNow = await page
    .locator('.exo-graph-viewport')
    .getAttribute('transform');
const decimals = /scale\(([\d.]+)\)/.exec(transformNow ?? '')?.[1].split('.')[1];
check(
    (decimals?.length ?? 0) > 2,
    'zoom is continuous, not quantised',
    `scale has ${decimals?.length ?? 0} decimals`
);

// ── zoom and pan ─────────────────────────────────────────────────────────────
const transformOf = () =>
    page.locator('.exo-graph-viewport').getAttribute('transform');
const atStart = await transformOf();
await page.locator('.exo-graph-zoom button').first().click();
check((await transformOf()) !== atStart, 'zooming in moves the viewport');

// Zooming has to REACH life size, or the labels can never be read.
for (let i = 0; i < 8 && (await scaleOf()) < 1; i++) {
    await page.locator('.exo-graph-zoom button').first().click();
}
const zoomed = await scaleOf();
check(zoomed >= 1, 'zooming reaches full size, where labels are legible', `scale ${zoomed.toFixed(2)}`);

const stage = await page.locator('.exo-graph-stage').boundingBox();
const beforeDrag = await transformOf();
await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
await page.mouse.down();
await page.mouse.move(stage.x + stage.width / 2 - 120, stage.y + stage.height / 2 - 60, {
    steps: 8,
});
await page.mouse.up();
check((await transformOf()) !== beforeDrag, 'dragging pans the graph');

// Two quick pans in a row: the browser reads them as a double-click, and a
// double-click opens a package. Panning must survive being done the way people
// actually do it.
const panTwice = async () => {
    for (let i = 0; i < 2; i++) {
        await page.mouse.move(pinchBox.x + 220, pinchBox.y + 120);
        await page.mouse.down();
        await page.mouse.move(pinchBox.x + 300, pinchBox.y + 170, { steps: 4 });
        await page.mouse.up();
    }
};
const beforeTwice = await transformOf();
await panTwice();
await page.waitForTimeout(400);
check(
    (await transformOf()) !== beforeTwice,
    'panning twice in quick succession still pans'
);
check(
    (await page.locator('.exo-graph-breadcrumb').count()) === 0,
    'panning twice does not drill into a package'
);

// Fit must bring it back to something sane.
await page.locator('.exo-graph-zoom button').nth(2).click();
const refitted = await transformOf();
check(
    Boolean(refitted && /scale\(/.test(refitted)),
    'fit puts the whole drawing back in view',
    refitted ?? ''
);

// ── finding something by name ───────────────────────────────────────────────
// The reader usually arrives knowing the name. Typing it must dim everything
// else and Enter must take them there.
const searchBox = page.locator('.exo-graph-search input');
await searchBox.fill('reactivity');
await page.waitForTimeout(200);
const dimmed = await page.locator('.exo-node.is-unmatched').count();
check(dimmed > 0, 'searching dims what does not match', `${dimmed} dimmed`);
check(
    /\d+ of \d+/.test((await page.locator('.exo-graph-search-count').textContent()) ?? ''),
    'the search says how many matched',
    (await page.locator('.exo-graph-search-count').textContent()) ?? ''
);
const beforeJump = await transformOf();
await searchBox.press('Enter');
await page.waitForTimeout(300);
check(
    (await page.locator('.exo-graph-details h3').textContent())?.includes('reactivity') === true,
    'Enter selects the first match',
    (await page.locator('.exo-graph-details h3').textContent()) ?? ''
);
check((await transformOf()) !== beforeJump, 'Enter brings the match into view');
await searchBox.fill('');
await page.waitForTimeout(200);
check(
    (await page.locator('.exo-node.is-unmatched').count()) === 0,
    'clearing the search brings everything back'
);

// ── the keyboard ────────────────────────────────────────────────────────────
// Everything the mouse can do, without one.
await page.locator('.exo-graph-stage').focus();
const beforeKeys = await transformOf();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
check((await transformOf()) !== beforeKeys, 'arrow keys pan the graph');
const beforeZoomKey = await scaleOf();
await page.keyboard.press('+');
await page.waitForTimeout(150);
check((await scaleOf()) > beforeZoomKey, 'plus zooms in');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check(
    (await page.locator('.exo-graph-details.is-open').count()) === 0,
    'Escape drops the selection'
);
// Fit is measured with the drawer SHUT, because fitting is relative to the
// stage — and the stage is wider when nothing is selected.
await page.keyboard.press('0');
await page.waitForTimeout(200);
check(
    Math.abs((await scaleOf()) - fitted) < 0.05,
    'zero fits the drawing again',
    `scale ${(await scaleOf()).toFixed(2)} vs ${fitted.toFixed(2)}`
);

// The drawer waits out the double-click window before sliding in, so anything
// that clicks INSIDE it has to wait for it to be there.
const openDrawer = async () => {
    await page.locator('.exo-graph-details.is-open').waitFor({ timeout: 5000 });
    await page.waitForTimeout(250);
};

// ── selecting a package ──────────────────────────────────────────────────────
// Click through the middle of a node's own box: Playwright's actionability
// checks fight the fixed navbar, and this is what a reader does anyway.
const clickNode = async selector => {
    const target =
        typeof selector === 'number'
            ? page.locator('[data-node] rect').nth(selector)
            : page.locator(`[data-node="${selector}"] rect`);
    const box = await target.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};
await clickNode(0);
await page.waitForTimeout(200);
const heading = await page.locator('.exo-graph-details h3').textContent();
check(Boolean(heading), 'clicking a package opens its details', heading ?? '');

// Panning must move the graph, not select its labels — a drag that leaves text
// highlighted is the difference between "works" and "feels broken".
const selected = await page.evaluate(() => String(window.getSelection() ?? ''));
check(selected === '', 'dragging does not select the labels', selected.slice(0, 30));

// ── drilling inside ──────────────────────────────────────────────────────────
const open = page.locator('.exo-graph-open');
if (await open.count()) {
    // Double-click is what a reader tries first; the button is the discoverable
    // version of the same thing. Both must work.
    const target = page.locator('[data-node] rect').first();
    const nodeBox = await target.boundingBox();
    await page.mouse.dblclick(
        nodeBox.x + nodeBox.width / 2,
        nodeBox.y + nodeBox.height / 2
    );
    await page.waitForTimeout(600);
    check(
        (await page.locator('.exo-graph-breadcrumb').count()) > 0,
        'double-clicking a package opens it'
    );
    if (await page.locator('.exo-graph-breadcrumb button').count()) {
        await page.locator('.exo-graph-breadcrumb button').evaluate(el => el.click());
        await page.waitForTimeout(300);
    }

    // A package with enough inside it to exercise the diagram: a bare one has
    // no members worth drawing and no types worth linking.
    await clickNode('@exodra/dom');
    await page.waitForTimeout(200);
    await openDrawer();
    await open.first().click({ force: true });
    await page.locator('.exo-graph-breadcrumb').waitFor({ timeout: 10000 });
    const inside = await page.locator('.exo-node-group').count();
    check(inside > 0, 'opening a package shows what is inside it', `${inside} entities`);

    // The arrowheads mean something specific; a reader who does not read UML
    // needs that spelled out next to the picture.
    check(
        (await page.locator('.exo-graph-legend--relations .exo-graph-legend-item').count()) > 2,
        'the arrowheads are explained in a legend'
    );

    // It has to read as UML, not as a graph of names: boxes carry their members
    // and edges carry an arrowhead that says which way — and what kind — the
    // relationship runs.
    check(
        (await page.locator('.exo-node-member').count()) > 0,
        'the boxes show their members'
    );
    check(
        (await page.locator('.exo-node-stereotype').count()) > 0,
        'non-classes are marked with a stereotype'
    );
    const arrowed = await page
        .locator('path[data-edge][marker-end]')
        .count();
    check(arrowed > 0, 'the relationships have UML arrowheads', `${arrowed} edges`);

    // A box shows what fits and says how many it left out. The panel beside the
    // drawing is where the rest lives — beside it, so the canvas stays whole.
    await clickNode('ExoNodeDom');
    await openDrawer();
    const panel = page.locator('.exo-graph-details');
    const listed = await panel.locator('.exo-graph-member-list li').count();
    const claimed = Number(
        /(\d+)/.exec((await panel.locator('h4').first().textContent()) ?? '')?.[1] ?? 0
    );
    check(
        listed > 8 && listed === claimed,
        'the panel lists every member, not just the ones that fit',
        `${listed} listed, box holds 8`
    );

    // The whole point of moving it off the canvas: every square of the drawing
    // can still be grabbed, including the part the panel used to float over.
    const stageBox = await page.locator('.exo-graph-stage').boundingBox();
    const panelBox = await panel.boundingBox();
    check(
        panelBox.x >= stageBox.x + stageBox.width - 1,
        'the panel sits beside the drawing, not on top of it',
        `panel at ${Math.round(panelBox.x)}, stage ends at ${Math.round(stageBox.x + stageBox.width)}`
    );
    // The drawer: shut, the drawing gets the whole stage; it slides in when
    // there is something to say, and the close button puts it away again.
    const stageWidthWithPanel = stageBox.width;
    await page.locator('.exo-graph-close').click();
    await page.waitForTimeout(400);
    const shutBox = await page.locator('.exo-graph-stage').boundingBox();
    check(
        (await page.locator('.exo-graph-details.is-open').count()) === 0 &&
            shutBox.width > stageWidthWithPanel + 100,
        'closing the panel gives the width back to the drawing',
        `${Math.round(stageWidthWithPanel)} → ${Math.round(shutBox.width)}`
    );
    await clickNode('ExoNodeDom');
    await openDrawer();
    check(
        (await page.locator('.exo-graph-details.is-open').count()) === 1 &&
            Math.abs((await page.locator('.exo-graph-stage').boundingBox()).width -
                stageWidthWithPanel) < 2,
        'selecting slides it back in'
    );

    // Measured again: the drawer has moved the stage's right edge since.
    const canvas = await page.locator('.exo-graph-stage').boundingBox();
    for (const [where, x, y] of [
        ['middle', canvas.x + canvas.width / 2, canvas.y + canvas.height / 2],
        ['top right', canvas.x + canvas.width - 40, canvas.y + 60],
        ['bottom right', canvas.x + canvas.width - 40, canvas.y + canvas.height - 60],
    ]) {
        const before = await transformOf();
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - 90, y - 45, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(150);
        check((await transformOf()) !== before, `dragging the ${where} of the drawing pans`);
    }

    check(
        (await panel.locator('.exo-graph-doc').count()) > 0,
        'members carry their JSDoc description'
    );
    check(
        (await panel.locator('.exo-graph-modifier').count()) > 0,
        'static and abstract members say so'
    );
    const cut = await panel
        .locator('.exo-graph-member-list code')
        .filter({ hasText: '…' })
        .count();
    check(cut === 0, 'the panel shows signatures in full, uncut', `${cut} truncated`);

    // Reading the panel must not throw away the selection that filled it.
    const panelNow = await panel.boundingBox();
    await page.mouse.click(panelNow.x + panelNow.width / 2, panelNow.y + 120);
    await page.waitForTimeout(200);
    check(
        (await panel.locator('h3').textContent()) === 'ExoNodeDom',
        'clicking inside the panel keeps the selection'
    );

    // Hovering a box's name must say what the thing is — the tooltip is the
    // cheapest answer to "what IS this" and works before any script runs.
    const named = await page
        .locator('.exo-node-label')
        .filter({ has: page.locator('title') })
        .count();
    check(named > 0, 'boxes explain themselves on hover', `${named} documented`);

    // A signature that names something on the diagram has to lead there.
    const link = page.locator('.exo-node-link').first();
    if (await link.count()) {
        const name = await link.textContent();
        const linkBox = await link.boundingBox();
        await page.mouse.click(
            linkBox.x + linkBox.width / 2,
            linkBox.y + linkBox.height / 2
        );
        await page.waitForTimeout(300);
        const opened = await page.locator('.exo-graph-details h3').textContent();
        check(
            opened === name,
            'clicking a type in a signature goes to that type',
            `${name} → ${opened}`
        );
    } else {
        check(false, 'members link to the types they name', 'no links found');
    }

    // Clicked on the element itself: the breadcrumb can sit under the site's
    // own fixed navbar, and then a pointer click lands on the navbar instead.
    await page.locator('.exo-graph-breadcrumb button').evaluate(el => el.click());
    await page
        .locator('.exo-graph-breadcrumb')
        .waitFor({ state: 'detached', timeout: 5000 })
        .catch(() => {});
    await page.waitForTimeout(300);
    const back = await page.locator('.exo-node-group').count();
    check(back === nodes, 'going back returns to the packages', `${back} of ${nodes}`);
} else {
    check(false, 'a package can be opened', 'no open button found');
}

// ── a link somebody can send ────────────────────────────────────────────────
// Opening a package and picking something inside it is a place, and a place
// needs an address. Checked by RELOADING the address, not by reading it back.
await clickNode('@exodra/dom');
await page.waitForTimeout(200);
await openDrawer();
await page.locator('.exo-graph-open').first().click({ force: true });
await page.locator('.exo-graph-breadcrumb').waitFor({ timeout: 10000 });
await page.waitForTimeout(500);
await clickNode('ExoNodeDom');
await page.waitForTimeout(300);
const shared = page.url();
check(
    shared.includes('atlas=') && shared.includes('ExoNodeDom'),
    'the address says where the reader is',
    shared.split('#')[1] ?? ''
);

await page.goto(shared, { waitUntil: 'networkidle' });
await page.locator('.exo-graph-details h3').waitFor({ timeout: 15000 }).catch(() => {});
check(
    (await page.locator('.exo-graph-breadcrumb').count()) > 0 &&
        (await page.locator('.exo-graph-details h3').textContent()) === 'ExoNodeDom',
    'opening that address lands on the same thing',
    (await page.locator('.exo-graph-details h3').textContent()) ?? 'nothing selected'
);

// ── while the insides are on their way ──────────────────────────────────────
// A double-click that shows nothing for a second gets double-clicked again.
await page.goto(url, { waitUntil: 'networkidle' });
await page.route('**/insides/*.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 900));
    await route.continue();
});
await page.locator('.exo-graph-stage').scrollIntoViewIfNeeded();
await clickNode('@exodra/dom');
await page.waitForTimeout(200);
await openDrawer();
await page.locator('.exo-graph-open').first().click({ force: true });
await page.waitForTimeout(250);
check(
    (await page.locator('.exo-graph-status').count()) > 0,
    'a slow fetch says that it is working'
);
await page.locator('.exo-graph-breadcrumb').waitFor({ timeout: 15000 });
check(
    (await page.locator('.exo-graph-status').count()) === 0,
    'the notice goes away when the drawing arrives'
);
await page.unroute('**/insides/*.json');

check(consoleErrors.length === 0, 'the console is clean', consoleErrors[0] ?? '');

await page.screenshot({ path: 'packages/monorepo-atlas/smoke.png', fullPage: false });
console.log('\nscreenshot: packages/monorepo-atlas/smoke.png');

await browser.close();

if (failures.length > 0) {
    console.error(`\n${failures.length} failed:\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log('\nall good');
