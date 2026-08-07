/**
 * The colour system for the graph, and the only place hex lives.
 *
 * There is ONE palette here, and it is a default — a starting point for a graph
 * nobody has configured yet. Anything embedding this is expected to put its own
 * colours in (see `paletteChoice.ts`); a menu of canned themes would only get in
 * the way of matching a host site's palette.
 *
 * What the default has to be is DEFENSIBLE, and three things decide that:
 *
 * 1. A node-link graph is an ALL-PAIRS form. Any two nodes can end up beside
 *    each other, so the palette has to hold every pair apart — not just the
 *    pairs that happen to be adjacent in a legend. That caps categorical colour
 *    at THREE hues; a fourth cannot clear the floors. Node kinds past the three
 *    render neutral rather than inventing a hue.
 * 2. Dark is SELECTED, not flipped. The dark column is its own steps, chosen for
 *    the dark surface — a colour that reads on white rarely reads on near-black.
 * 3. Both columns were measured, not eyeballed. Under all-pairs, in both modes:
 *    worst CVD ΔE 13.0, worst normal-vision ΔE 27.5 light / 26.5 dark (OKLab
 *    ×100; target ≥ 8 and ≥ 15). This trio was picked over the alternative we
 *    measured (blue/orange/aqua, CVD ΔE 9.2 / 9.4) precisely for that margin —
 *    it is the most forgiving default for whatever a reader changes around it.
 *
 * `checkColors.ts` runs those same measurements live, so custom colours are held
 * to exactly this bar.
 *
 * Rule violations do NOT take a categorical hue: they wear the reserved status
 * colour, always alongside a dashed stroke and a badge, so meaning never rests
 * on colour alone.
 */

export type TExoGraphMode = 'light' | 'dark';

/** The node kinds that get a hue. Everything else renders neutral. */
export type TExoGraphKind = 'runtime' | 'tooling' | 'app';

export type TExoGraphPalette = {
    /** Chart surface the nodes sit on — what the contrast checks are run against. */
    surface: string;
    /** Page plane behind the chart surface. */
    plane: string;
    inkPrimary: string;
    inkSecondary: string;
    inkMuted: string;
    /** Hairline for edges at rest. */
    edge: string;
    /** Edge under focus, and the node ring. */
    edgeStrong: string;
    border: string;
    kind: Record<TExoGraphKind, string>;
    /** Neutral fill for kinds past the three-hue cap. */
    kindOther: string;
    statusCritical: string;
    statusWarning: string;
};

/**
 * Light mode puts two of the three hues below 3:1 against the surface. That is
 * flagged rather than hidden: identity may not rest on the fill alone — and here
 * it does not, because every node carries its package name, without which a
 * dependency graph is unreadable anyway.
 */
export const EXO_GRAPH_LIGHT: TExoGraphPalette = {
    surface: '#fcfcfb',
    plane: '#f9f9f7',
    inkPrimary: '#0b0b0b',
    inkSecondary: '#52514e',
    inkMuted: '#898781',
    edge: '#c3c2b7',
    edgeStrong: '#52514e',
    border: 'rgba(11,11,11,0.10)',
    kind: { runtime: '#2a78d6', tooling: '#e87ba4', app: '#008300' },
    kindOther: '#898781',
    statusCritical: '#d03b3b',
    statusWarning: '#fab219',
};

export const EXO_GRAPH_DARK: TExoGraphPalette = {
    surface: '#1a1a19',
    plane: '#0d0d0d',
    inkPrimary: '#ffffff',
    inkSecondary: '#c3c2b7',
    inkMuted: '#898781',
    edge: '#383835',
    edgeStrong: '#c3c2b7',
    border: 'rgba(255,255,255,0.10)',
    kind: { runtime: '#3987e5', tooling: '#d55181', app: '#008300' },
    kindOther: '#898781',
    statusCritical: '#d03b3b',
    statusWarning: '#fab219',
};

export function defaultPalette(mode: TExoGraphMode): TExoGraphPalette {
    return mode === 'dark' ? EXO_GRAPH_DARK : EXO_GRAPH_LIGHT;
}

/** The kinds a reader can recolour, in the order the picker shows them. */
export const EXO_GRAPH_KINDS: readonly TExoGraphKind[] = [
    'runtime',
    'tooling',
    'app',
];
