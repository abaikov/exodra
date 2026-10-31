// THE MARKUP GATE for the uhtml participant. The app itself is `apps/uhtml/uhtml.tsx` and the whole
// argument for its shape is `apps/uhtml/uhtml.md`; this file only proves the two trees agree byte
// for byte.
import { el } from '../../shared/todo-spec';
import { markupOf } from '../../gates/markup-gate';
import { mountUhtmlApp } from '../../apps/uhtml/uhtml';

export { mountUhtmlApp };
export type { TUhtmlSignal, TUhtmlComputed } from '../../apps/uhtml/uhtml';

// COMMENTS ARE STRIPPED FROM BOTH SIDES BY `markupOf`: uhtml leaves one `<!--◦-->` per ARRAY hole as
// udomdiff's anchor, and text holes leave nothing. The element count printed beside every result is
// what a strip cannot cover.
function diff(stage: string, refC: HTMLElement, subC: HTMLElement): boolean {
    const a = markupOf(refC);
    const b = markupOf(subC);
    const refN = refC.querySelectorAll('*').length;
    const subN = subC.querySelectorAll('*').length;
    if (a === b) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ uhtml-app === reference exodra-app @ ${stage} — ${a.length} chars, ` +
                `${refN} elements (reference) / ${subN} elements (uhtml)`
        );
        return true;
    }
    let at = 0;
    while (at < a.length && at < b.length && a[at] === b[at]) at++;
    const from = Math.max(0, at - 80);
    // eslint-disable-next-line no-console
    console.log(
        `❌ uhtml-app !== reference exodra-app @ ${stage} — ` +
            `${refN} elements (reference) / ${subN} elements (uhtml), ` +
            `first difference at char ${at}\n` +
            `  reference: …${a.slice(from, at + 160)}…\n` +
            `  uhtml    : …${b.slice(from, at + 160)}…`
    );
    return false;
}

// THE THIRD STAGE IS NOT REDUNDANT: one round moves every card in ONE direction only, while a second
// puts a GROW straight after a SHRINK on the same tag list — which is what aims the gate at
// `udomdiff`'s anchors and at the details block's `<!--◦-->` surviving an empty pass. It is also the
// first stage at which a deck's date has to STAND STILL: round 1 moves user 1, so decks 1 and 6 move
// and the other eight must not.
export async function verifyUhtmlApp(): Promise<boolean> {
    const { mountExodraApp } = await import('../exodra/app');
    const refC = el();
    const subC = el();
    const ref = mountExodraApp(refC);
    const sub = mountUhtmlApp(subC);

    let ok = diff('mount', refC, subC);
    ref.flip();
    sub.flip();
    ok =
        diff(
            'one update round (decks renamed + details toggled + tag lists advanced)',
            refC,
            subC
        ) && ok;
    ref.flip();
    sub.flip();
    ok = diff('a second update round (deck names 1 → 2, tag lists wrap 4 → 1)', refC, subC) && ok;

    ref.teardown();
    refC.remove();
    sub.teardown();
    subC.remove();
    // eslint-disable-next-line no-console
    console.log(ok ? '✅ uhtml-app is a faithful reproduction' : '❌ uhtml-app DIVERGES');
    return ok;
}
