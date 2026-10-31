import { describe, expect, it } from 'vitest';
import { colorReport, contrastRatio, deltaE, isHexColor } from '../colorReport';
import { EXO_GRAPH_DARK, EXO_GRAPH_LIGHT } from '../palettes';

const LIGHT_SURFACE = '#fcfcfb';
const DARK_SURFACE = '#1a1a19';

/**
 * These expected numbers come from the reference palette validator, run
 * separately over the same colours. This port has to reproduce them — otherwise
 * the picker would be measuring something else while claiming the same bar.
 */
describe('matches the reference validator', () => {
    it("reproduces the validator's numbers on known colour sets", () => {
        const worstCvd = (colors: readonly string[]): number => {
            let worst = Infinity;
            for (let i = 0; i < colors.length; i++) {
                for (let j = i + 1; j < colors.length; j++) {
                    worst = Math.min(
                        worst,
                        Math.min(
                            deltaE(colors[i], colors[j], 'protan'),
                            deltaE(colors[i], colors[j], 'deutan')
                        )
                    );
                }
            }
            return Math.round(worst * 10) / 10;
        };

        // Two known trios, light and dark, each measured by the reference
        // validator. The second is the one shipped as the built-in palette.
        expect(worstCvd(['#2a78d6', '#eb6834', '#1baf7a'])).toBe(9.2);
        expect(worstCvd(['#3987e5', '#d95926', '#199e70'])).toBe(9.4);
        expect(worstCvd(['#2a78d6', '#e87ba4', '#008300'])).toBe(13.0);
        expect(worstCvd(['#3987e5', '#d55181', '#008300'])).toBe(13.0);
    });

    it('reproduces the recorded contrast for a flagged colour', () => {
        // The validator reported aqua at 2.74 against the light surface.
        expect(Math.round(contrastRatio('#1baf7a', LIGHT_SURFACE) * 100) / 100).toBe(2.74);
    });
});

describe('colorReport', () => {
    it('passes the built-in palette in both modes', () => {
        const light = colorReport(Object.values(EXO_GRAPH_LIGHT.kind), {
            mode: 'light',
            surface: LIGHT_SURFACE,
        });
        const dark = colorReport(Object.values(EXO_GRAPH_DARK.kind), {
            mode: 'dark',
            surface: DARK_SURFACE,
        });

        // The default may not FAIL. Light mode carries a contrast WARN by
        // design — the node labels are the relief.
        expect(light.status).not.toBe('fail');
        expect(dark.status).toBe('pass');
    });

    it('fails a pair that a red-green colour-blind reader cannot separate', () => {
        // Green vs red: the textbook confusion.
        const report = colorReport(['#008300', '#a35a00'], {
            mode: 'light',
            surface: LIGHT_SURFACE,
        });
        const cvd = report.checks.find((check) => check.id === 'cvd')!;
        expect(cvd.status).toBe('fail');
        expect(cvd.culprits).toHaveLength(2);
        expect(report.status).toBe('fail');
    });

    it('fails two colours that are simply too close', () => {
        const report = colorReport(['#2a78d6', '#2f7bd8'], {
            mode: 'light',
            surface: LIGHT_SURFACE,
        });
        expect(report.checks.find((check) => check.id === 'normal')!.status).toBe('fail');
    });

    it('warns when a colour is faint against its surface', () => {
        const report = colorReport(['#2a78d6', '#eb6834', '#f7f7f2'], {
            mode: 'light',
            surface: LIGHT_SURFACE,
        });
        const contrast = report.checks.find((check) => check.id === 'contrast')!;
        expect(contrast.status).toBe('warn');
        expect(contrast.culprits).toContain('#f7f7f2');
    });

    it('warns on a near-gray "colour"', () => {
        const report = colorReport(['#7a7a78', '#eb6834'], {
            mode: 'light',
            surface: LIGHT_SURFACE,
        });
        expect(report.checks.find((check) => check.id === 'chroma')!.status).toBe('warn');
    });

    it('reports a bad hex without pretending to measure it', () => {
        const report = colorReport(['#2a78d6', 'not-a-colour'], {
            mode: 'light',
            surface: LIGHT_SURFACE,
        });
        expect(report.status).toBe('fail');
        expect(report.checks).toHaveLength(1);
        expect(report.checks[0].culprits).toEqual(['not-a-colour']);
    });

    it('accepts hex with or without the hash, and trims', () => {
        expect(isHexColor('#2a78d6')).toBe(true);
        expect(isHexColor('2a78d6')).toBe(true);
        expect(isHexColor('  #2a78d6  ')).toBe(true);
        expect(isHexColor('#2a78d')).toBe(false);
        expect(isHexColor('rgb(1,2,3)')).toBe(false);
    });

    it('judges a single colour without inventing pair results', () => {
        const report = colorReport(['#2a78d6'], {
            mode: 'light',
            surface: LIGHT_SURFACE,
        });
        expect(report.checks.some((check) => check.id === 'cvd')).toBe(false);
        expect(report.status).toBe('pass');
    });
});
