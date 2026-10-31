import { setExoHtml } from '../dom/setExoHtml';

// A plain `el.innerHTML === wanted` reports a mismatch on markup that is nothing of the kind: the
// parser normalises and the serialiser prints its own spelling (`<br/>` → `<br>`, quotes, implicit
// `<tbody>`), so a page that merely spells itself differently would rebuild its largest subtree on
// every hydration, taking focus, selection, a playing `<video>` and decoded images with it.
// The second compare therefore runs both sides through the SAME parser, into a shallow clone of
// the element so the parse context — tag and namespace — is the live one.
// Reached from `TExoHydrateNode.bind` only, and only for ports whose live setter IS `setExoHtml`; a
// `set()` fill is never repaired, because the repair needs a source the client can re-read.
// The write goes through `setExoHtml` rather than adopting the clone's children: a port defended by
// "a hydrated page is the page a client render would have drawn" must not have two writers.
export function repairExoHtml(node: Element, value: unknown): void {
    // `null`/`undefined` clear the element on both backends, and an empty element serialises to
    // the empty string — so the cheap compare answers that case with no clone at all.
    const wanted = value == null ? '' : String(value);
    const showing = node.innerHTML;
    if (showing === wanted) return;
    const probe = node.cloneNode(false) as Element;
    probe.innerHTML = wanted;
    if (probe.innerHTML === showing) return;
    setExoHtml(node, value);
}
