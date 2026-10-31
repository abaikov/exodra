// THE MARKUP GATE FOR THE LAST THREE UNGATED PARTICIPANTS — solid, react and voby.
//
// ═══ WHAT WAS UNCHECKED UNTIL THIS FILE EXISTED ═══
//
// `initial-render` and `app-update` byte-diff every participant they time against the reference
// app in `apps/exodra/exodra.tsx` — lit, mikado, stage0, uhtml, sinuous, the exodra rows, and (since
// `svelte-marko-gate.ts`) svelte and marko. Solid, React and voby were never in that list. The
// only thing that had ever looked at them was `scripts/verify-structure.mjs`, whose whole check
// is `d.querySelectorAll(s).length` — six element counts, mounted once, never after an update.
//
// A COUNT CANNOT SEE A TEXT NODE, AND A COUNT CANNOT SEE AN UPDATE. That is not a hypothetical
// weakness: it is the exact hole through which Svelte rendered four whitespace text nodes inside
// every one of the 80 cards — 320 nodes — for this suite's whole life, with every count in
// `verify-structure.mjs` green. It also cannot see an attribute that stopped being written, a
// headline that stopped being recomputed, or a keyed list that reinserted at the wrong end, since
// none of those changes an element count either.
//
// These three carry the app's three DERIVED VALUES (`headlineOf`, `expandedOf`, `tagsLabel` —
// `todo-spec.ts`) and were rewritten to that contract; every one of those three is a value a count
// is blind to by construction. Two are text and one is an attribute.
//
// ═══ WHY THE GATE IS NOT NEXT TO THE PARTICIPANT ═══
//
// The same reason `svelte-marko-gate.ts` gives for svelte and marko: the function these axes
// TIME is not `SolidApp` / `ReactApp` / `vobyApp`, it is the `solid` / `react` / `voby` entry of
// `loadMounts()` in `todo-app.tsx`, which owns the framework's synchronous flush (`flushSync`,
// `tick`) and its disposer. A gate written against anything else would be gating a second mount
// that can drift from the timed one. So the mount is taken as an ARGUMENT and the axes pass in
// the very entry whose numbers appear in the table.
//
// `todo-app.tsx` also imports solid-js, react and svelte at module scope, so a gate living inside
// it would drag the whole field into any module graph that wanted one gate.
//
// ═══ IT IS THE SAME GATE, NOT A SEVENTH SPELLING ═══
//
// `verifyAgainstReference` is imported from `svelte-marko-gate.ts` rather than re-typed here.
// Five of the eleven participants on these axes come out of `loadMounts()`, they need the identical
// check for the identical reason, and a second copy of a diff loop is a second place for the rule to
// soften by accident — which is how these axes ended up with a count-only check in the first place.
//
// ═══ THREE STAGES, LIKE SVELTE AND MARKO, AND THE ARGUMENT FOR IT ═══
//
// Mount, one update round, then a SECOND update round. The older five third-party gates
// (`verifyLitApp`, `verifyMikadoApp`, `verifyStage0App`, `verifyUhtmlApp`, `verifySinuousApp`) stop
// at two, and `svelte-marko-gate.ts` flags its third stage as possibly unfair for holding two
// participants to a bar the others are not held to. It is not unfair, and the reason is worth being
// exact about: A GATE IS NOT A MEASUREMENT. It runs outside every timed region, it cannot move a
// number, and the only two things it can do are let an axis run or abort it. So a stricter gate
// costs its participant nothing except the possibility of being caught, and "caught less often" is
// not an advantage anybody should want.
//
// What the third stage buys is specific rather than decorative. One round moves every card in ONE
// direction only — every details block closes, every tag list grows. A second round puts a GROW
// straight after a SHRINK on the same list (the cards that start at 4 wrap to 1 on the first click
// and go 1 → 2 on the second) and a SHRINK straight after a GROW, and re-OPENS every details block
// that the first round closed. A conditional whose anchor drifted after removal, or a keyed
// reconcile that reinserts at the wrong end only when the list has just shrunk, is invisible at
// stage two and fails at stage three. Solid's `<Show>`/`<For>` and voby's `<For>` are exactly that
// machinery, and React's `key`ed child array is the third spelling of it.
//
// THE OLDER FIVE SHOULD MOVE TO THREE TOO — that is a recommendation this file does not act on,
// because they are not this file's to edit. The asymmetry that matters is not that svelte, marko
// and these three are held to more; it is that lit, mikado, stage0, uhtml and sinuous publish
// numbers with LESS proof behind them, and the fix for that is to raise the five, never to lower
// the seven. The cost is two extra flips in a function nothing times.
//
// ═══ COULD `markupOf` BE RELIED ON — CHECKED, NOT ASSUMED ═══
//
// `markup-gate.ts:26-28` is, in full:
//
//     container.innerHTML.replace(/<!--[\s\S]*?-->/g, '')
//
// It strips COMMENT NODES and does nothing else — no trim, no whitespace collapse, no attribute
// reordering, no case or quote normalisation. `innerHTML` serialises a whitespace text node as its
// characters, so a stray space between `</h3>` and `<button` survives into the compared string and
// fails the diff at that character. Attribute ORDER is preserved by the serialiser, which is why
// `apps/exodra/exodra.tsx` and `todo-app.tsx` both spell out that `class` comes before `data-i` on
// the card and before `aria-expanded` on the toggle: this gate would fail on the swap.
//
// WHAT THE COMMENT STRIP FORGIVES, FOR EACH OF THE THREE, named because a gate that forgave
// something unnamed would be worthless:
//   solid — the compiled template's `<!>` placeholder for a dynamic child that has static siblings
//           (the `<Show>` between `.tog` and `.tags`), plus `<For>`'s own anchor.
//   voby  — `createComment()` placeholders (`voby/dist/utils/setters.js`) for the fine-grained
//           child position and for `<For>`.
//   react — nothing found. React DOM emits comment separators when it SERVER-renders adjacent
//           text, and on the client it renders `null` as no node at all; the `open ? … : null`
//           slot in `ReactCard` therefore leaves the DOM empty rather than anchored. So React is
//           the one participant here whose tree the strip does not touch, and if React ever
//           diverges it will not be because something was forgiven.
//
// That is a difference of STRATEGY — the schema core bounds its regions with static siblings, see
// `attach-exo-list.ts` — and it is the only difference forgiven. An element, an attribute, a text
// node, an order: all fail.
import type { AppHandle } from '../shared/todo-spec';
import { verifyAgainstReference } from './svelte-marko-gate';

/** A mount as the axes hold it: build the app in `container`, hand back `flip`/`teardown`. */
type TMount = (container: HTMLElement) => AppHandle;

/**
 * SOLID — `SolidApp` mounted through `loadMounts().solid`, which owns `render()` and its disposer.
 *
 * WHAT THIS GATE IS BEING ASKED ABOUT, beyond the whitespace it was built for: Solid's compiler
 * decides for itself which JSX expressions become effects, and the participant's three derived
 * values are written as DERIVED SIGNALS — plain functions read at their position (`{headline()}`,
 * `aria-expanded={expanded()}`, `{label()}`). If the compiler ever treated one of those reads as
 * static, the value would be correct at mount and frozen afterwards; that is invisible at stage one
 * and is precisely what stages two and three catch.
 */
export function verifySolidApp(mount: TMount): Promise<boolean> {
    return verifyAgainstReference('solid-app', mount);
}

/**
 * REACT — `ReactApp` mounted through `loadMounts().react`, which owns `createRoot` and the two
 * `flushSync` calls that make a native-dispatched click commit before `flip` returns.
 *
 * WHAT THIS GATE IS BEING ASKED ABOUT: attribute ORDER, more than anything else. React writes a
 * host element's attributes in the order the props object enumerates, and `ReactCard` lists
 * `className` first and the dynamic attribute second for exactly that reason — `class` then
 * `data-i` on the card, `class` then `aria-expanded` on the toggle. Nothing in the language
 * enforces that ordering; a later edit that put `data-i` first would produce a correct application
 * and a different byte string, and until this gate existed nothing in the package could tell.
 */
export function verifyReactApp(mount: TMount, who = 'react-app'): Promise<boolean> {
    return verifyAgainstReference(who, mount);
}

/**
 * PREACT — `apps/react/react.tsx` with `react` resolved to `preact/compat`. The one thing forgiven is
 * attribute ORDER: Preact writes `className` after the element's other props (observed: `data-i`
 * and `aria-expanded` land before `class`), which no CSS selector, query or handler can see. Every
 * element, text node, attribute value and whitespace is still compared byte for byte.
 */
/**
 * MILLION — the JSX twin compiled by Million's own compiler (`auto` mode) and run on React. Million
 * wraps every dynamic hole of a block in a `<slot>` element (530 of them beside the 861 every row
 * builds), so its tree is not this app's tree and its row does MORE DOM work, not less. The wrappers
 * are unwrapped before the comparison and nothing else is forgiven.
 */
export function verifyMillionApp(mount: TMount): Promise<boolean> {
    return verifyAgainstReference('million-app', mount, 'exact', 'unwrapped');
}

export function verifyPreactApp(mount: TMount): Promise<boolean> {
    return verifyAgainstReference('preact-app', mount, 'any');
}

/**
 * VOBY — `vobyApp` mounted through `loadMounts().voby`, which owns `render()`'s disposer and the
 * `oby` `tick()` that drains voby's scheduler inside the round.
 *
 * WHAT THIS GATE IS BEING ASKED ABOUT: whether the thunk-in-position idiom really is fine-grained
 * at all three of the derived values. voby's readme promises that a function in an attribute or
 * child position updates "in a fine-grained manner"; a position where that did not hold would
 * render the mount value and then never move, which no element count can see and which stage two
 * fails on immediately. Its `class`-before-`data-i` key order matters here for the same reason it
 * does in React — voby's `setProps` walks the object in key order.
 */
export function verifyVobyApp(mount: TMount): Promise<boolean> {
    return verifyAgainstReference('voby-app', mount);
}
