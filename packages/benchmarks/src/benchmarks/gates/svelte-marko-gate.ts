// THE MARKUP GATE FOR THE TWO COMPILED PARTICIPANTS — svelte and marko.
//
// WHY THIS FILE EXISTS AT ALL, AND WHY IT IS NOT NEXT TO THE PARTICIPANT LIKE EVERY OTHER GATE.
// The five modules under `participants/` — `lit/app.tsx`, `uhtml/app.tsx`, `sinuous/app.tsx`,
// `stage0/app.tsx` and `mikado/app.tsx` — each carry their own `verify…App` beside the mount
// adapter for the app in `apps/<name>/` that it gates. Svelte and Marko
// cannot: their participants are `svelte/CardsDyn.svelte` and `marko/CardsDyn.marko`, compiled
// template files with no place to hang a TypeScript export, and the mount that the axes actually
// TIME is not in them either — it is the `svelte` / `marko` entry of `loadMounts()` in
// `todo-app.tsx`, which owns the framework's synchronous flush (`flushSync`, `run`). So the gate
// takes that mount as an argument and gates the exact function the axis times, rather than a
// second mount written here that could drift from it.
//
// WHAT WENT UNCHECKED UNTIL THIS FILE EXISTED, stated plainly because it is the whole reason for
// it: `initial-render` and `app-update` verified lit, mikado, stage0, uhtml, sinuous and the
// exodra rows, and NOT svelte and NOT marko. Those two were covered only by
// `scripts/verify-structure.mjs`, which compares element COUNTS. A count cannot see a text node.
// (SOLID, REACT AND VOBY WERE IN THE SAME HOLE and are not named above because this file did not
// close it for them; `solid-react-voby-gate.ts` does, through the loop below.)
// Svelte does not drop whitespace between elements — `clean_nodes` collapses a whitespace-only
// text run between two nodes to a single `' '` and KEEPS it — so an indented card template
// rendered four real space text nodes inside every `.card`, 320 across the app, and no gate in
// this package could see them. That is what these two functions are for.
//
// ═══ WHY `markupOf` IS ENOUGH FOR EXACTLY THAT DEFECT ═══
//
// A gate that cannot see the thing it was built for is worse than no gate, so this was checked
// before it was relied on. `markupOf` (markup-gate.ts) is:
//
//     container.innerHTML.replace(/<!--[\s\S]*?-->/g, '')
//
// It removes COMMENT NODES and nothing else. It does not trim, it does not collapse runs of
// whitespace, it does not normalise attribute order or quoting — `innerHTML` serialises a space
// text node as a space, and that space survives into the compared string. So a stray `' '`
// between `</h3>` and `<button` fails this comparison at the exact character. The comment strip
// is deliberate and cannot hide it: Svelte, Marko, Lit, Solid and Angular all mark a reactive
// position with a comment the reference marks with nothing, and a comment is not a text node.
//
// The one thing the strip DOES cost is a whitespace difference that lives inside a comment, which
// is not a difference in rendered markup at all.
//
// ═══ THE STAGES ═══
//
// Mount, then one update round, then a SECOND update round. The first two are what every
// third-party gate in this package compares at. The third is the one `apps/exodra/exodra.md`
// argues for and is worth the same here: one round moves each card in ONE direction only, while a
// second round puts a GROW straight after a SHRINK on the same tag list (the cards that started
// at 4 wrapped to 1 on the first click and go 1 → 2 on the second) and a SHRINK straight after a
// GROW. A keyed `{#each}` / `<for by>` that reinserted at the wrong end, or a conditional block
// whose anchor moved, shows there and nowhere earlier. It costs two flips in a gate nothing times.
import { el, type AppHandle } from '../shared/todo-spec';
import { markupOf } from './markup-gate';

/** A mount as the axes hold it: build the app in `container`, hand back `flip`/`teardown`. */
type TMount = (container: HTMLElement) => AppHandle;

/**
 * One stage of one participant, diffed against the reference. Returns whether they matched and
 * prints WHERE they stopped matching when they did not — the character index plus the 80 bytes
 * before it and 160 after, on both sides, because a single space is invisible in a summary and
 * this gate exists for a single space.
 *
 * The element count goes beside every result for the reason `markup-gate.ts` gives: the comment
 * strip cannot excuse an element, so the count is what makes an extra wrapper readable at a
 * glance. A whitespace divergence leaves the counts EQUAL and the strings different, which is
 * exactly how the defect that motivated this file reads.
 */
function withoutSlotWrappers(container: HTMLElement): HTMLElement {
    const copy = container.cloneNode(true) as HTMLElement;
    for (const slot of Array.from(copy.querySelectorAll('slot')).reverse()) {
        slot.replaceWith(...Array.from(slot.childNodes));
    }
    copy.normalize();
    return copy;
}

function withSortedAttributes(container: HTMLElement): HTMLElement {
    const copy = container.cloneNode(true) as HTMLElement;
    for (const element of Array.from(copy.querySelectorAll('*'))) {
        const attributes = Array.from(element.attributes)
            .map((attribute) => [attribute.name, attribute.value] as const)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        for (const [name] of attributes) element.removeAttribute(name);
        for (const [name, value] of attributes) element.setAttribute(name, value);
    }
    return copy;
}

function diff(
    who: string,
    stage: string,
    refC: HTMLElement,
    subC: HTMLElement,
    attributeOrder: 'exact' | 'any',
    slotWrappers: 'refused' | 'unwrapped'
): boolean {
    const a = markupOf(attributeOrder === 'any' ? withSortedAttributes(refC) : refC);
    const unwrapped = slotWrappers === 'unwrapped' ? withoutSlotWrappers(subC) : subC;
    const b = markupOf(attributeOrder === 'any' ? withSortedAttributes(unwrapped) : unwrapped);
    const refN = refC.querySelectorAll('*').length;
    const subN = subC.querySelectorAll('*').length;
    if (a === b) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ ${who} === reference exodra-app @ ${stage} — ${a.length} chars, ` +
                `${refN} elements (reference) / ${subN} elements (${who})`
        );
        return true;
    }
    let at = 0;
    while (at < a.length && at < b.length && a[at] === b[at]) at++;
    const from = Math.max(0, at - 80);
    // eslint-disable-next-line no-console
    console.log(
        `❌ ${who} !== reference exodra-app @ ${stage} — ` +
            `${refN} elements (reference) / ${subN} elements (${who}), ` +
            `first difference at char ${at}\n` +
            `  reference: …${a.slice(from, at + 160)}…\n` +
            `  ${who}: …${b.slice(from, at + 160)}…\n` +
            `  reference char ${at}: ${JSON.stringify(a[at] ?? '<end>')}, ` +
            `${who} char ${at}: ${JSON.stringify(b[at] ?? '<end>')}`
    );
    return false;
}

/**
 * The gate itself, shared by both participants because the reason they need one is the same and a
 * second copy of a diff loop is a second place for the rule to soften.
 *
 * EXPORTED, because the same argument reaches further than the two participants this file is named
 * after. Solid, React and voby come out of `loadMounts()` for the same reason svelte and marko do,
 * were ungated for the same reason, and need this exact function — see `solid-react-voby-gate.ts`,
 * which holds their three wrappers and calls this. Five of the eleven participants on
 * `initial-render` and `app-update` now run through this one loop; a second copy of it would be a
 * second place for the rule to soften, which is how these axes acquired a count-only check in the
 * first place.
 *
 * The reference is imported dynamically, exactly as `verifyLitApp` and the other third-party gates
 * import it, so this module stays loadable without the schema core behind it.
 */
export async function verifyAgainstReference(
    who: string,
    mount: TMount,
    attributeOrder: 'exact' | 'any' = 'exact',
    slotWrappers: 'refused' | 'unwrapped' = 'refused'
): Promise<boolean> {
    const { mountExodraApp } = await import('../participants/exodra/app');
    const refC = el();
    const subC = el();
    const ref = mountExodraApp(refC);
    const sub = mount(subC);

    let ok = diff(who, 'mount', refC, subC, attributeOrder, slotWrappers);
    ref.flip();
    sub.flip();
    ok =
        diff(
            who,
            'one update round (details toggled + tag lists advanced)',
            refC,
            subC,
            attributeOrder,
            slotWrappers
        ) && ok;
    ref.flip();
    sub.flip();
    ok =
        diff(
            who,
            'a second update round (tag lists wrap 4 → 1)',
            refC,
            subC,
            attributeOrder,
            slotWrappers
        ) && ok;

    ref.teardown();
    refC.remove();
    sub.teardown();
    subC.remove();
    // eslint-disable-next-line no-console
    console.log(ok ? `✅ ${who} is a faithful reproduction` : `❌ ${who} DIVERGES`);
    return ok;
}

/**
 * SVELTE — `svelte/CardsDyn.svelte` mounted through `loadMounts().svelte`, which is where the
 * `flushSync` that commits an update inside the round lives.
 *
 * WHAT SVELTE LEAVES IN THE DOM THAT THE REFERENCE DOES NOT, named because a gate that forgave
 * something unnamed would be worthless: comment anchors. Svelte 5 marks the position of an `{#if}`
 * and of each `{#each}` block with a comment, and `markupOf` strips comments from both sides —
 * that is a difference of STRATEGY (the schema core bounds its regions with static siblings) and
 * it is the only thing forgiven. Whitespace is NOT forgiven and is the reason this gate exists.
 */
export function verifySvelteApp(mount: TMount): Promise<boolean> {
    return verifyAgainstReference('svelte-app', mount);
}

/**
 * MARKO — `marko/CardsDyn.marko` mounted through `loadMounts().marko`, which owns the `run()` that
 * drains Marko's queue inside the round.
 *
 * Marko's parser drops a whitespace-only run that is a newline plus indentation, so its templates
 * may be indented; what it does NOT drop is a bare space between two tags. That is a rule about the
 * participant's source, and this gate is the only thing in the package that can tell whether the
 * rule was followed.
 */
export function verifyMarkoApp(mount: TMount): Promise<boolean> {
    return verifyAgainstReference('marko-app', mount);
}
