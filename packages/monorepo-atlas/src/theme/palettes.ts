// The only place hex lives. A node-link graph is an ALL-PAIRS form — any two nodes can end up
// beside each other — which caps categorical colour at THREE hues, since a fourth cannot clear the
// contrast floors; kinds past the three render neutral. Dark is SELECTED, not flipped: a colour
// that reads on white rarely reads on near-black.
//
// MEASURED, not eyeballed, under all-pairs in both modes: worst CVD ΔE 13.0, worst normal-vision ΔE
// 27.5 light / 26.5 dark (OKLab ×100; target ≥ 8 and ≥ 15), against blue/orange/aqua's CVD ΔE
// 9.2 / 9.4. `colorReport.ts` runs the same measurements live, so custom colours meet this bar.
//
// Rule violations do NOT take a categorical hue: they wear the reserved status colour, always
// alongside a dashed stroke and a badge, so meaning never rests on colour alone.

export type TExoGraphMode = 'light' | 'dark';

// The node kinds that get a hue. Everything else renders neutral.
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

// Light mode puts two of the three hues below 3:1 against the surface, flagged rather than hidden:
// identity does not rest on the fill alone, since every node carries its package name.
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
export const EXO_GRAPH_KINDS: readonly TExoGraphKind[] = ['runtime', 'tooling', 'app'];
