// THE BYTE GATE for the idiomatically-reactive Mikado participant. The app itself is
// `apps/mikado/mikado-reactive.tsx`; what its idiom costs in markup is in
// `apps/mikado/mikado-reactive.md`.
import { el } from '../../shared/todo-spec';
import { mountMikadoReactiveApp } from '../../apps/mikado/mikado-reactive';

export { mountMikadoReactiveApp };

// ALL comments are stripped from both sides: Exodra marks a fragment's position with an empty
// comment anchor and Mikado has no anchors at all — a strategy difference, not a markup difference.
// Mikado's per-node bookkeeping lives in expando properties, so the strip hides nothing of its.
const COMMENTS = /<!--[\s\S]*?-->/g;
const ROUTES = / click="[^"]*"/g;
const markup = (c: HTMLElement): string => c.innerHTML.replace(COMMENTS, '');

/**
 * THE ROUTE ATTRIBUTE IS NOT HIDDEN, IT IS PRICED. Mikado's delegation has no route table keyed by
 * node — the attribute IS the registration — so this participant cannot emit the reference's
 * markup. Suppressing that silently would let it carry payload the others do not and still read as
 * "identical"; failing on it would drop the only idiomatically-reactive Mikado row we have. So:
 * strip for the STRUCTURAL comparison, and print the count and the byte cost beside the result.
 *
 * If ANY divergence survives the strip, the gate still fails — this exemption is exactly one
 * attribute name wide.
 */
function diff(stage: string, refC: HTMLElement, mikC: HTMLElement): boolean {
    const a = markup(refC);
    const raw = markup(mikC);
    const b = raw.replace(ROUTES, '');
    const refN = refC.querySelectorAll('*').length;
    const mikN = mikC.querySelectorAll('*').length;
    if (a === b) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ mikado-reactive-app === reference exodra-app @ ${stage} — ${a.length} chars, ` +
                `${refN} elements (reference) / ${mikN} elements (mikado-reactive)` +
                `; PLUS ${(raw.match(ROUTES) ?? []).length} route attributes ` +
                `(${raw.length - b.length} bytes) Mikado's delegation must leave in the DOM`
        );
        return true;
    }
    let at = 0;
    while (at < a.length && at < b.length && a[at] === b[at]) at++;
    const from = Math.max(0, at - 80);
    // How much of the divergence is Mikado's routing, and how much is anything else.
    const routes = raw.match(ROUTES);
    const verdict =
        b === a
            ? "IDENTICAL — Mikado's route attribute is the WHOLE divergence"
            : 'STILL DIFFERENT — something other than the routing diverges too';
    // eslint-disable-next-line no-console
    console.log(
        `❌ mikado-reactive-app !== reference exodra-app @ ${stage} — ` +
            `${refN} elements (reference) / ${mikN} elements (mikado-reactive), ` +
            `first difference at char ${at}\n` +
            `  reference      : …${a.slice(from, at + 160)}…\n` +
            `  mikado-reactive: …${b.slice(from, at + 160)}…\n` +
            `  ${routes ? routes.length : 0} route attributes in this markup; ` +
            `with them removed the two sides are ${verdict}`
    );
    return false;
}

/** THREE STAGES, and the third is not symmetry: only a SECOND round puts a grow straight after a
 *  shrink, pushes back a tag whose user's setting moved while it was OFF SCREEN (the one path
 *  `addtag`'s refresh exists for), and asks the FIRST round's two deck dates NOT to move. */
export async function verifyMikadoReactiveApp(): Promise<boolean> {
    const { mountExodraApp } = await import('../exodra/app');
    const refC = el();
    const mikC = el();
    const ref = mountExodraApp(refC);
    const mik = mountMikadoReactiveApp(mikC);

    let ok = diff('mount', refC, mikC);
    ref.flip();
    mik.flip();
    ok = diff('one update round (decks renamed, details toggled, tags advanced)', refC, mikC) && ok;
    ref.flip();
    mik.flip();
    ok = diff('a second update round (decks renamed, tag lists wrap 4 → 1)', refC, mikC) && ok;

    ref.teardown();
    refC.remove();
    mik.teardown();
    mikC.remove();
    // eslint-disable-next-line no-console
    console.log(
        ok ? '✅ mikado-reactive-app is a faithful reproduction' : '❌ mikado-reactive-app DIVERGES'
    );
    return ok;
}
