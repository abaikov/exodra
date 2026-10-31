// The byte gate for the Sinuous participant. The app itself is `apps/sinuous/sinuous.tsx`; why it
// is written the way it is, and what its three stages are aimed at, is `apps/sinuous/sinuous.md`.
import { el } from '../../shared/todo-spec';
import { markupOf } from '../../gates/markup-gate';
import { mountSinuousApp } from '../../apps/sinuous/sinuous';

export { mountSinuousApp };

function diff(stage: string, refC: HTMLElement, subC: HTMLElement): boolean {
    const a = markupOf(refC);
    const b = markupOf(subC);
    const refN = refC.querySelectorAll('*').length;
    const subN = subC.querySelectorAll('*').length;
    if (a === b) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ sinuous-app === reference exodra-app @ ${stage} — ${a.length} chars, ` +
                `${refN} elements (reference) / ${subN} elements (sinuous)`
        );
        return true;
    }
    let at = 0;
    while (at < a.length && at < b.length && a[at] === b[at]) at++;
    const from = Math.max(0, at - 80);
    // eslint-disable-next-line no-console
    console.log(
        `❌ sinuous-app !== reference exodra-app @ ${stage} — ` +
            `${refN} elements (reference) / ${subN} elements (sinuous), ` +
            `first difference at char ${at}\n` +
            `  reference: …${a.slice(from, at + 160)}…\n` +
            `  sinuous  : …${b.slice(from, at + 160)}…`
    );
    return false;
}

export async function verifySinuousApp(): Promise<boolean> {
    const { mountExodraApp } = await import('../exodra/app');
    const refC = el();
    const subC = el();
    const ref = mountExodraApp(refC);
    const sub = mountSinuousApp(subC);

    let ok = diff('mount', refC, subC);
    ref.flip();
    sub.flip();
    ok =
        diff(
            'one update round (decks renamed + details toggled + tag lists advanced)',
            refC,
            subC
        ) && ok;
    // The THIRD stage: Sinuous marks a position with an EMPTY TEXT NODE, which serialises to
    // nothing, so a marker in the wrong place is invisible in the bytes until something lands
    // beside it — which is what a GROW straight after a SHRINK does. Round 1 also moves user 1, so
    // decks 1 and 6 must move their dates and the other eight must stay byte-identical.
    ref.flip();
    sub.flip();
    ok = diff('a second update round (deck names 1 → 2, tag lists wrap 4 → 1)', refC, subC) && ok;

    ref.teardown();
    refC.remove();
    sub.teardown();
    subC.remove();
    // eslint-disable-next-line no-console
    console.log(ok ? '✅ sinuous-app is a faithful reproduction' : '❌ sinuous-app DIVERGES');
    return ok;
}
