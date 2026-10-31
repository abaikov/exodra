// THE BYTE GATE for the directly written Mikado participant. The app itself is `apps/mikado/mikado.tsx`
// and the account of what its idiom could and could not reach is `apps/mikado/mikado.md`.
import { el } from '../../shared/todo-spec';
import { mountMikadoApp } from '../../apps/mikado/mikado';

export { mountMikadoApp };

// ALL comments are stripped from both sides: Exodra marks a fragment's position with an empty
// comment anchor and Mikado has no anchors at all — a strategy difference, not a markup difference.
// Mikado's own per-node bookkeeping lives in expando properties, so the strip hides nothing of its.
const COMMENTS = /<!--[\s\S]*?-->/g;
const markup = (c: HTMLElement): string => c.innerHTML.replace(COMMENTS, '');

function diff(stage: string, refC: HTMLElement, mikC: HTMLElement): boolean {
    const a = markup(refC);
    const b = markup(mikC);
    const refN = refC.querySelectorAll('*').length;
    const mikN = mikC.querySelectorAll('*').length;
    if (a === b) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ mikado-app === reference exodra-app @ ${stage} — ${a.length} chars, ` +
                `${refN} elements (reference) / ${mikN} elements (mikado)`
        );
        return true;
    }
    let at = 0;
    while (at < a.length && at < b.length && a[at] === b[at]) at++;
    const from = Math.max(0, at - 80);
    // eslint-disable-next-line no-console
    console.log(
        `❌ mikado-app !== reference exodra-app @ ${stage} — ` +
            `${refN} elements (reference) / ${mikN} elements (mikado), ` +
            `first difference at char ${at}\n` +
            `  reference: …${a.slice(from, at + 160)}…\n` +
            `  mikado   : …${b.slice(from, at + 160)}…`
    );
    return false;
}

/** THREE STAGES, and the third is not symmetry: only a SECOND round puts a grow straight after a
 *  shrink, takes a pooled tag back out for a different card, and asks a deck date NOT to move. */
export async function verifyMikadoApp(): Promise<boolean> {
    const { mountExodraApp } = await import('../exodra/app');
    const refC = el();
    const mikC = el();
    const ref = mountExodraApp(refC);
    const mik = mountMikadoApp(mikC);

    let ok = diff('mount', refC, mikC);
    ref.flip();
    mik.flip();
    ok =
        diff(
            'one update round (decks renamed + details toggled + tag lists advanced)',
            refC,
            mikC
        ) && ok;
    ref.flip();
    mik.flip();
    ok =
        diff('a second update round (tag lists wrap 4 → 1, a second author moves)', refC, mikC) &&
        ok;

    ref.teardown();
    refC.remove();
    mik.teardown();
    mikC.remove();
    // eslint-disable-next-line no-console
    console.log(ok ? '✅ mikado-app is a faithful reproduction' : '❌ mikado-app DIVERGES');
    return ok;
}
