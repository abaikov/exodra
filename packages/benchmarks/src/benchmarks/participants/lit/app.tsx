// THE MARKUP GATE for the lit participant. The app itself is `apps/lit/lit.tsx` and the whole
// argument for its shape is `apps/lit/lit.md`; this file only proves the two trees agree byte for
// byte.
import { el } from '../../shared/todo-spec';
import { mountLitApp } from '../../apps/lit/lit';

export { mountLitApp };

// COMMENTS ARE STRIPPED FROM BOTH SIDES, and here that matters more than for the other
// participants: lit MARKS every dynamic position with a comment — `<!--?lit$…-->` for a part it
// prepared and `<!---->` for the boundaries of a committed range. Nothing in the app emits a comment
// of its own, so stripping them cannot hide a real divergence; the ELEMENT COUNT reported beside
// every diff is the part comments cannot excuse. 861 against 861, or the row is not rendering this
// app.
const COMMENTS = /<!--[\s\S]*?-->/g;
const markup = (c: HTMLElement): string => c.innerHTML.replace(COMMENTS, '');

function diff(stage: string, refC: HTMLElement, litC: HTMLElement): boolean {
    const a = markup(refC);
    const b = markup(litC);
    const refN = refC.querySelectorAll('*').length;
    const litN = litC.querySelectorAll('*').length;
    if (a === b) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ lit-app === reference exodra-app @ ${stage} — ${a.length} chars, ` +
                `${refN} elements (reference) / ${litN} elements (lit)`
        );
        return true;
    }
    let at = 0;
    while (at < a.length && at < b.length && a[at] === b[at]) at++;
    const from = Math.max(0, at - 80);
    // eslint-disable-next-line no-console
    console.log(
        `❌ lit-app !== reference exodra-app @ ${stage} — ` +
            `${refN} elements (reference) / ${litN} elements (lit), ` +
            `first difference at char ${at}\n` +
            `  reference: …${a.slice(from, at + 160)}…\n` +
            `  lit      : …${b.slice(from, at + 160)}…`
    );
    return false;
}

// THE THIRD STAGE IS NOT REDUNDANT: one round moves every card in ONE direction only, while a second
// puts a GROW straight after a SHRINK on the same tag list and a SHRINK straight after a GROW —
// which is what aims the gate at `repeat()`'s keyed reinsertion and at the `nothing` conditional's
// ChildPart boundary. Neither shows at mount and neither shows after one round.
export async function verifyLitApp(): Promise<boolean> {
    const { mountExodraApp } = await import('../exodra/app');
    const refC = el();
    const litC = el();
    const ref = mountExodraApp(refC);
    const lit = mountLitApp(litC);

    let ok = diff('mount', refC, litC);
    ref.flip();
    lit.flip();
    ok = diff('one update round (renames + toggles + tag lists)', refC, litC) && ok;
    ref.flip();
    lit.flip();
    ok = diff('a second update round (deck names 1 → 2, tag lists wrap 4 → 1)', refC, litC) && ok;

    ref.teardown();
    refC.remove();
    lit.teardown();
    litC.remove();
    // eslint-disable-next-line no-console
    console.log(ok ? '✅ lit-app is a faithful reproduction' : '❌ lit-app DIVERGES');
    return ok;
}
