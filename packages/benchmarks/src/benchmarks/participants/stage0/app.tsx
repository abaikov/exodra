// The byte gate for the stage0 participant. The app itself is `apps/stage0/stage0.tsx`; why it is
// written the way it is, and what its three stages are aimed at, is `apps/stage0/stage0.md`.
import { el } from '../../shared/todo-spec';
import { markupOf } from '../../gates/markup-gate';
import { mountStage0App } from '../../apps/stage0/stage0';

export { mountStage0App };

function diff(stage: string, refC: HTMLElement, subC: HTMLElement): boolean {
    const a = markupOf(refC);
    const b = markupOf(subC);
    const refN = refC.querySelectorAll('*').length;
    const subN = subC.querySelectorAll('*').length;
    if (a === b) {
        // eslint-disable-next-line no-console
        console.log(
            `✅ stage0-app === reference exodra-app @ ${stage} — ${a.length} chars, ` +
                `${refN} elements (reference) / ${subN} elements (stage0)`
        );
        return true;
    }
    let at = 0;
    while (at < a.length && at < b.length && a[at] === b[at]) at++;
    const from = Math.max(0, at - 80);
    // eslint-disable-next-line no-console
    console.log(
        `❌ stage0-app !== reference exodra-app @ ${stage} — ` +
            `${refN} elements (reference) / ${subN} elements (stage0), ` +
            `first difference at char ${at}\n` +
            `  reference: …${a.slice(from, at + 160)}…\n` +
            `  stage0   : …${b.slice(from, at + 160)}…`
    );
    return false;
}

export async function verifyStage0App(): Promise<boolean> {
    const { mountExodraApp } = await import('../exodra/app');
    const refC = el();
    const subC = el();
    const ref = mountExodraApp(refC);
    const sub = mountStage0App(subC);

    let ok = diff('mount', refC, subC);
    ref.flip();
    sub.flip();
    ok = diff('one update round (decks renamed, cards toggled, tags advanced)', refC, subC) && ok;
    // The THIRD stage: a second round puts a GROW straight after a SHRINK on the same tag list, the
    // only thing that can expose a `rendered` array out of step with the DOM or a re-cloned details
    // block landing in the wrong place. Neither shows at mount or after one round.
    ref.flip();
    sub.flip();
    ok = diff('a second update round (tag lists wrap 4 → 1)', refC, subC) && ok;

    ref.teardown();
    refC.remove();
    sub.teardown();
    subC.remove();
    // eslint-disable-next-line no-console
    console.log(ok ? '✅ stage0-app is a faithful reproduction' : '❌ stage0-app DIVERGES');
    return ok;
}
