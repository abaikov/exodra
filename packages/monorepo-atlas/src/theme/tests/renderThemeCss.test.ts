import { describe, expect, it } from 'vitest';
import { EXO_GRAPH_DARK, EXO_GRAPH_KINDS, EXO_GRAPH_LIGHT } from '../palettes';
import { renderThemeCss } from '../renderThemeCss';

describe('the built-in palette', () => {
    it('selects its dark colours rather than flipping the light ones', () => {
        expect(EXO_GRAPH_LIGHT.kind).not.toEqual(EXO_GRAPH_DARK.kind);
        expect(EXO_GRAPH_LIGHT.surface).not.toBe(EXO_GRAPH_DARK.surface);
    });

    it('caps categorical hues at three — the all-pairs limit for a graph', () => {
        for (const palette of [EXO_GRAPH_LIGHT, EXO_GRAPH_DARK]) {
            const hues = Object.values(palette.kind);
            expect(hues).toHaveLength(EXO_GRAPH_KINDS.length);
            expect(new Set(hues).size).toBe(3);
        }
    });

    it('never reuses a status colour as a categorical hue', () => {
        for (const palette of [EXO_GRAPH_LIGHT, EXO_GRAPH_DARK]) {
            const hues = Object.values(palette.kind);
            expect(hues).not.toContain(palette.statusCritical);
            expect(hues).not.toContain(palette.statusWarning);
        }
    });
});

describe('renderThemeCss', () => {
    const css = renderThemeCss();

    it('resolves mode from the OS preference and from an explicit stamp', () => {
        expect(css).toContain('@media (prefers-color-scheme: dark)');
        expect(css).toContain(":root[data-theme='dark']");
        expect(css).toContain("[data-mode='dark']");
    });

    it('lets an explicit light stamp beat OS dark', () => {
        expect(css).toContain(":root:where(:not([data-theme='light']))");
    });

    it('exposes every colour as a custom property a host can override', () => {
        for (const kind of EXO_GRAPH_KINDS) {
            expect(css).toContain(`--exo-kind-${kind}:`);
        }
        expect(css).toContain('--exo-surface:');
        expect(css).toContain('--exo-ink:');
        expect(css).toContain('color-scheme: dark;');
    });

    it('leaves its defaults at zero specificity so a host always wins', () => {
        // Without this, whichever stylesheet the browser loaded last decides the
        // colours — and the library is usually last, because it is injected.
        for (const line of css.split('\n')) {
            if (!line.includes('--exo-kind-runtime')) continue;
        }
        expect(css).toContain(':where(.exo-graph)');
        expect(css).not.toMatch(/^\.exo-graph \{/m);
    });

    it('can be scoped to a different root', () => {
        expect(renderThemeCss('#my-graph')).toContain(':where(#my-graph)');
    });
});
