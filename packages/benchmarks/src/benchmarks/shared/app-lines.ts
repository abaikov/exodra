// WHAT THE APP COST EACH PARTICIPANT, IN LINES — the numbers `abBench` prints beside the medians.
//
// The counting happens in Node, at the moment Vite serves the page: `scripts/app-sloc.mjs` hands
// every file in `app-files.ts` to TypeScript's own parser and counts the lines that carry a token,
// so a comment, a blank line and a `//` inside a string are each treated as what they are. The
// result arrives here as `virtual:app-sloc` — see the plugin in `vite.config.ts`.
//
// COUNTED AT RUN TIME AND NEVER TYPED IN. A number a human writes down is right on the day it is
// written and wrong after the next edit, and nothing would say which day it is.
import COUNTED from 'virtual:app-sloc';
import { APP_FILES } from './app-files';

/**
 * WHAT ONE ROW'S APP COST, or `null` when this run cannot say.
 *
 * `null` for a row its axis mapped to `null` — a floor, a null twin, a variant declared inside the
 * axis file and not in an app module — and `null` for a participant one of whose files the counter
 * could not read. The second case is a REFUSAL and not a zero: a missing file counted as zero would
 * print as the leanest participant in the table.
 */
export function appLinesOf(participant: string | null): number | null {
    if (participant === null) return null;
    const files = APP_FILES[participant];
    if (files === undefined) {
        throw new Error(
            `app-lines: no app file list for \`${participant}\`. An axis asked for a line count ` +
                'under a name `app-files.ts` does not carry, which is a typo or a participant ' +
                'nobody listed. Add it to `APP_FILES`, or map the row to `null` if it has no app.'
        );
    }
    let total = 0;
    for (const file of files) {
        const n = COUNTED[file];
        if (n === undefined || n === null) return null;
        total += n;
    }
    return total;
}

/**
 * THE COUNT PER ROW, for `abBench`'s `appLines` option.
 *
 * The argument maps a ROW NAME to a participant in `APP_FILES`, and it is written out per axis
 * rather than inferred from the row name — because a row name is the axis's label and not always
 * the participant's. `component-split` prints a row called `svelte` that renders a SOLID component;
 * an identity mapping would charge it Svelte's line count, which would be a lie with a plausible
 * name on it.
 */
export function appLines(
    rows: Readonly<Record<string, string | null>>
): Readonly<Record<string, number | null>> {
    const out: Record<string, number | null> = {};
    // A ROW MAPPED TO A PARTICIPANT AND STILL WITHOUT A NUMBER IS A REFUSAL, and it is said here
    // rather than in the printer — this is the only place that knows the difference between a row
    // the axis deliberately gave no participant (a floor, a null control) and one whose files the
    // counter could not read. A `—` that means "not an app" and a `—` that means "could not count"
    // look identical in the table, and only one of them is something to fix.
    const unreadable: string[] = [];
    for (const row of Object.keys(rows)) {
        const participant = rows[row];
        const n = appLinesOf(participant);
        if (n === null && participant !== null) unreadable.push(`${row} (${participant})`);
        out[row] = n;
    }
    if (unreadable.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
            `❌ NO APP LOC: ${unreadable.join(', ')} — these rows name a participant in ` +
                '`app-files.ts` whose app files this run could not read, so the column prints `—` ' +
                'for them. Read it as unmeasured, never as small.'
        );
    }
    return out;
}
