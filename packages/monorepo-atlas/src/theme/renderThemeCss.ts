import {
    EXO_GRAPH_DARK,
    EXO_GRAPH_LIGHT,
    type TExoGraphMode,
    type TExoGraphPalette,
} from './palettes';

/**
 * Emit the colour system as CSS custom properties.
 *
 * Colours live in CSS rather than in the rendered marks on purpose:
 *
 *  - the server-rendered SVG must be correct on first paint, before any script
 *    runs, in whichever mode the reader is already in;
 *  - a colour change then costs a handful of property writes on ONE element, not
 *    a re-render of several hundred nodes. Nothing in the graph observes it.
 *
 * What ships here is only the DEFAULT. A host overrides any of these properties
 * — in its own stylesheet or through the picker — and the graph follows, because
 * every mark paints from `var(--exo-…)`.
 *
 * Mode resolves in the order a reader expects: an explicit choice wins,
 * otherwise the OS preference decides. That is the same contract Docusaurus (and
 * most docs sites) already use with `data-theme`, so an embedded graph follows
 * the surrounding page for free.
 */
export function renderThemeCss(scope = '.exo-graph'): string {
    // Every default is wrapped in `:where()`, which strips it to ZERO
    // specificity. A host overrides any of these with a plain `.exo-graph { … }`
    // in its own stylesheet and wins — without !important, and regardless of
    // which stylesheet the browser happens to load last. Defaults must be the
    // easiest thing in the cascade to beat.
    return [
        rule(`:where(${scope})`, vars(EXO_GRAPH_LIGHT, 'light')),

        // OS dark, unless the page explicitly stamped light. `:where()` keeps
        // this at zero specificity so the explicit stamps below always win.
        rule(
            `:root:where(:not([data-theme='light'])) :where(${scope}), ` +
                `:where(${scope}[data-mode='dark'])`,
            vars(EXO_GRAPH_DARK, 'dark'),
            '@media (prefers-color-scheme: dark)'
        ),

        // Explicit stamps — from the host page, or from the graph's own control.
        rule(
            `:where(:root[data-theme='dark'] ${scope}), ` +
                `:where(${scope}[data-mode='dark'])`,
            vars(EXO_GRAPH_DARK, 'dark')
        ),
        rule(
            `:where(:root[data-theme='light'] ${scope}), ` +
                `:where(${scope}[data-mode='light'])`,
            vars(EXO_GRAPH_LIGHT, 'light')
        ),
    ].join('\n');
}

function vars(palette: TExoGraphPalette, mode: TExoGraphMode): string {
    return [
        `color-scheme: ${mode};`,
        `--exo-surface: ${palette.surface};`,
        `--exo-plane: ${palette.plane};`,
        `--exo-ink: ${palette.inkPrimary};`,
        `--exo-ink-secondary: ${palette.inkSecondary};`,
        `--exo-ink-muted: ${palette.inkMuted};`,
        `--exo-edge: ${palette.edge};`,
        `--exo-edge-strong: ${palette.edgeStrong};`,
        `--exo-border: ${palette.border};`,
        `--exo-kind-runtime: ${palette.kind.runtime};`,
        `--exo-kind-tooling: ${palette.kind.tooling};`,
        `--exo-kind-app: ${palette.kind.app};`,
        `--exo-kind-other: ${palette.kindOther};`,
        `--exo-status-critical: ${palette.statusCritical};`,
        `--exo-status-warning: ${palette.statusWarning};`,
    ].join('\n    ');
}

function rule(selector: string, body: string, atRule?: string): string {
    const declaration = `${selector} {\n    ${body}\n}`;
    return atRule ? `${atRule} {\n${indent(declaration)}\n}` : declaration;
}

const indent = (text: string): string =>
    text
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n');
