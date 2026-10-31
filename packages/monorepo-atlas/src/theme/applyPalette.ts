import { colorReport } from './colorReport';
import { EXO_GRAPH_KINDS, type TExoGraphMode, type TExoGraphPalette } from './palettes';

/**
 * The colours a HOST supplies. Everything is optional: whatever is left out
 * keeps the built-in value, so a site that only cares about the three node
 * colours says only that.
 *
 * Light and dark are given separately rather than derived from one another. A
 * colour that reads on white rarely reads on near-black, and deriving one from
 * the other is exactly the shortcut that produces washed-out dark themes.
 */
export type TExoPaletteOverride = Partial<
    Pick<
        TExoGraphPalette,
        | 'surface'
        | 'plane'
        | 'inkPrimary'
        | 'inkSecondary'
        | 'inkMuted'
        | 'edge'
        | 'edgeStrong'
        | 'border'
        | 'kindOther'
        | 'statusCritical'
        | 'statusWarning'
    >
> & {
    kind?: Partial<TExoGraphPalette['kind']>;
};

export type TExoColors = {
    light?: TExoPaletteOverride;
    dark?: TExoPaletteOverride;
};

const VAR_BY_FIELD: Record<string, string> = {
    surface: '--exo-surface',
    plane: '--exo-plane',
    inkPrimary: '--exo-ink',
    inkSecondary: '--exo-ink-secondary',
    inkMuted: '--exo-ink-muted',
    edge: '--exo-edge',
    edgeStrong: '--exo-edge-strong',
    border: '--exo-border',
    kindOther: '--exo-kind-other',
    statusCritical: '--exo-status-critical',
    statusWarning: '--exo-status-warning',
};

/**
 * Push a host's colours onto the graph container.
 *
 * Written as CSS custom properties on ONE element, because that is all it takes:
 * every mark paints from `var(--exo-…)`, so nothing in the graph observes the
 * palette and nothing re-renders. A host that would rather do this in its own
 * stylesheet can skip this function entirely and set the same properties there —
 * which is the better route when the colours are already CSS variables.
 */
export function applyColors(element: HTMLElement, colors: TExoColors, mode: TExoGraphMode): void {
    const palette = colors[mode];
    if (!palette) return;

    for (const [field, property] of Object.entries(VAR_BY_FIELD)) {
        const value = (palette as Record<string, string | undefined>)[field];
        if (value) element.style.setProperty(property, value);
    }
    for (const kind of EXO_GRAPH_KINDS) {
        const value = palette.kind?.[kind];
        if (value) element.style.setProperty(`--exo-kind-${kind}`, value);
    }
}

/**
 * Which mode the page is in: an explicit stamp on the root wins (that is what a
 * docs theme toggle sets), otherwise the OS decides. Matches the stylesheet's
 * own resolution order, so JS and CSS never disagree about which mode is active.
 */
export function resolveMode(
    root: { dataset?: DOMStringMap } | null,
    prefersDark: boolean
): TExoGraphMode {
    const stamped = root?.dataset?.theme;
    if (stamped === 'dark') return 'dark';
    if (stamped === 'light') return 'light';
    return prefersDark ? 'dark' : 'light';
}

/**
 * Hold a host's colours to the same bar the built-in ones were held to, and say
 * so in the console rather than in the interface.
 *
 * A host palette can easily put two node kinds on colours nobody can tell apart
 * — the graph cannot refuse it (they are the host's colours), but it should not
 * pretend everything is fine either. Development only: the check costs nothing
 * to skip, and a warning in a production console helps no one.
 */
export function warnAboutColors(
    colors: TExoColors,
    mode: TExoGraphMode,
    resolved: TExoGraphPalette
): void {
    if (!colors[mode]) return;

    const report = colorReport(Object.values(resolved.kind), {
        mode,
        surface: resolved.surface,
    });
    if (report.status === 'pass') return;

    for (const check of report.checks) {
        if (check.status === 'pass') continue;
        const message = `[exo-graph] ${check.message}${
            check.culprits?.length ? ` (${check.culprits.join(', ')})` : ''
        }`;
        console[check.status === 'fail' ? 'error' : 'warn'](message);
    }
}
