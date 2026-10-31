// THE MARKUP GATE the axes share — one copy, because a diff is the first thing to drift.
//
// A timing comparison between two renderers that do not build the same tree is worthless, so
// an axis that gains a NEW participant has to prove that participant's markup against the
// reference one BEFORE it times anything. The reference is the schema core's app in
// `apps/exodra/exodra.tsx`; `toggle`, `reactive-update`, `virtual-list` and `reconcile` all need the
// same check, and four more hand-written diffs is four more places for the rule to soften by
// accident.
//
// COMMENTS ARE STRIPPED FROM BOTH SIDES. Third-party renderers mark a reactive child position
// with a marker comment of their own — Solid and Lit both do, Angular emits one per `@if`/`@for`
// — and the schema core marks it with nothing at all (its regions are bounded by static
// siblings — see `attach-exo-list.ts`). That is a difference of STRATEGY, and it is the only thing
// this file forgives. Everything else — an element, an attribute, a text node, an order — fails
// the gate.
//
// THE ELEMENT COUNT IS PRINTED BESIDE EVERY RESULT because the strip above cannot cover an
// element: a participant that quietly emitted an extra wrapper would still be caught by the
// byte diff, but the count is what makes the failure readable at a glance.
//
// IT THROWS. A gate that returns `false` and lets the run continue is a comment, not a gate.

const COMMENTS = /<!--[\s\S]*?-->/g;

/** A container's HTML with the comment anchors taken out. */
export function markupOf(container: HTMLElement): string {
    return container.innerHTML.replace(COMMENTS, '');
}

/**
 * Require `subject` to have built the same tree as `reference`, right now.
 *
 * `axis` and `stage` are only for the message — "which axis, and at which point in its
 * scenario", because the interesting failures are the ones that appear only AFTER an update.
 */
export function gateMarkup(
    axis: string,
    stage: string,
    who: string,
    reference: HTMLElement,
    subject: HTMLElement
): void {
    const want = markupOf(reference);
    const got = markupOf(subject);
    const refN = reference.querySelectorAll('*').length;
    const subN = subject.querySelectorAll('*').length;
    if (want === got) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ gate ${axis}/${who} @ ${stage}: identical markup — ` +
                `${want.length} chars, ${refN} elements`
        );
        return;
    }
    let at = 0;
    while (at < want.length && at < got.length && want[at] === got[at]) at++;
    const from = Math.max(0, at - 80);
    // eslint-disable-next-line no-console
    console.log(
        `❌ gate ${axis}/${who} @ ${stage}: DIFFERENT markup — ` +
            `${refN} elements (reference) / ${subN} elements (${who}), ` +
            `first difference at char ${at}\n` +
            `  reference: …${want.slice(from, at + 160)}…\n` +
            `  ${who}   : …${got.slice(from, at + 160)}…`
    );
    throw new Error(
        `${axis}: ${who} builds a different tree from the reference @ ${stage} ` +
            `(${refN} vs ${subN} elements, first difference at char ${at}) — ` +
            'the timings below would be comparing different programs'
    );
}
