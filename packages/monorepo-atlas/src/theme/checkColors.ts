/**
 * The palette checks, running INSIDE the explorer so they apply to whatever the
 * reader picks — not just to the colours that shipped.
 *
 * A colour picker that accepts anything silently produces graphs where two node
 * kinds are the same colour to a deuteranope, or where a node is invisible
 * against its own background. So the picker measures instead of trusting: it
 * reports, live, whether the current choice holds its pairs apart and clears the
 * surface. Nothing is blocked — it is the reader's tool — but nothing is hidden
 * either.
 *
 * The maths is the standard one, not invented here: OKLab distance, and the
 * Machado–Oliveira–Fernandes (2009) colour-vision-deficiency transforms at
 * severity 1.0. The thresholds are the same ones the shipped presets were held
 * to, so a custom palette is judged by exactly the same bar.
 */

export type TExoCheckStatus = 'pass' | 'warn' | 'fail';

export type TExoColorCheck = {
    id: 'band' | 'chroma' | 'cvd' | 'normal' | 'contrast';
    status: TExoCheckStatus;
    /** One line, written for the person moving the slider. */
    message: string;
    /** The colours responsible, when the check names any. */
    culprits?: readonly string[];
};

export type TExoColorReport = {
    status: TExoCheckStatus;
    checks: readonly TExoColorCheck[];
};

// OKLCH lightness band per mode — outside it a hue stops behaving like a
// categorical colour on that surface.
const BAND = { light: [0.43, 0.77], dark: [0.48, 0.67] } as const;
const CHROMA_FLOOR = 0.1;
const CVD_TARGET = 8;
const CVD_FLOOR = 6;
const NORMAL_FLOOR = 15;
const CONTRAST_MIN = 3;

const MACHADO = {
    protan: [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998],
    ],
    deutan: [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.01182, 0.04294, 0.968881],
    ],
    tritan: [
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.3039],
    ],
} as const;

type TVision = keyof typeof MACHADO;
type TRgb = readonly [number, number, number];

const HEX = /^#?[0-9a-fA-F]{6}$/;

/** Accepts `#rrggbb` (with or without the hash), rejects anything else. */
export function isHexColor(value: string): boolean {
    return HEX.test(value.trim());
}

function toLinear(hex: string): TRgb {
    const clean = hex.trim().replace(/^#/, '');
    const channel = (index: number): number => {
        const srgb = parseInt(clean.slice(index, index + 2), 16) / 255;
        return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    };
    return [channel(0), channel(2), channel(4)];
}

function oklab([r, g, b]: TRgb): TRgb {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

function simulate(linear: TRgb, vision: TVision): TRgb {
    const m = MACHADO[vision];
    const clamp = (value: number): number => Math.max(0, Math.min(1, value));
    return [
        clamp(m[0][0] * linear[0] + m[0][1] * linear[1] + m[0][2] * linear[2]),
        clamp(m[1][0] * linear[0] + m[1][1] * linear[1] + m[1][2] * linear[2]),
        clamp(m[2][0] * linear[0] + m[2][1] * linear[1] + m[2][2] * linear[2]),
    ];
}

/** OKLab distance ×100. Omit `vision` for unsimulated (normal) sight. */
export function deltaE(a: string, b: string, vision?: TVision): number {
    const left = oklab(vision ? simulate(toLinear(a), vision) : toLinear(a));
    const right = oklab(vision ? simulate(toLinear(b), vision) : toLinear(b));
    return (
        100 *
        Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2])
    );
}

export function contrastRatio(a: string, b: string): number {
    const luminance = (hex: string): number => {
        const [r, g, bl] = toLinear(hex);
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

function lightnessAndChroma(hex: string): readonly [number, number] {
    const [L, a, b] = oklab(toLinear(hex));
    return [L, Math.hypot(a, b)];
}

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * Check a set of categorical colours against a surface.
 *
 * ALL pairs are compared, not just neighbouring ones: in a node-link graph any
 * two nodes can end up side by side, so "adjacent in the legend" means nothing.
 */
export function checkColors(
    colors: readonly string[],
    options: { mode: 'light' | 'dark'; surface: string }
): TExoColorReport {
    const { mode, surface } = options;
    const valid = colors.filter(isHexColor);
    const checks: TExoColorCheck[] = [];

    if (valid.length !== colors.length) {
        return {
            status: 'fail',
            checks: [
                {
                    id: 'band',
                    status: 'fail',
                    message: 'Not a valid #rrggbb colour.',
                    culprits: colors.filter(color => !isHexColor(color)),
                },
            ],
        };
    }

    const [lo, hi] = BAND[mode];
    const offBand = valid.filter(color => {
        const [L] = lightnessAndChroma(color);
        return L < lo || L > hi;
    });
    checks.push({
        id: 'band',
        status: offBand.length ? 'warn' : 'pass',
        message: offBand.length
            ? `Too ${mode === 'light' ? 'light or dark' : 'dark or light'} for the ${mode} surface — categorical colours read best between L ${lo} and ${hi}.`
            : `Lightness sits in the ${mode} band.`,
        culprits: offBand,
    });

    const grayish = valid.filter(
        color => lightnessAndChroma(color)[1] < CHROMA_FLOOR
    );
    checks.push({
        id: 'chroma',
        status: grayish.length ? 'warn' : 'pass',
        message: grayish.length
            ? 'Too close to gray to read as a colour category.'
            : 'Every colour is saturated enough to read as a category.',
        culprits: grayish,
    });

    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < valid.length; i++) {
        for (let j = i + 1; j < valid.length; j++) pairs.push([valid[i], valid[j]]);
    }

    if (pairs.length > 0) {
        let worstCvd = Infinity;
        let worstCvdPair: [string, string] = pairs[0];
        let worstNormal = Infinity;
        let worstNormalPair: [string, string] = pairs[0];

        for (const [a, b] of pairs) {
            // The gate is the better-seen of protan/deutan: a pair only fails
            // when BOTH forms of red-green deficiency lose it.
            const cvd = Math.min(deltaE(a, b, 'protan'), deltaE(a, b, 'deutan'));
            if (cvd < worstCvd) {
                worstCvd = cvd;
                worstCvdPair = [a, b];
            }
            const normal = deltaE(a, b);
            if (normal < worstNormal) {
                worstNormal = normal;
                worstNormalPair = [a, b];
            }
        }

        checks.push({
            id: 'cvd',
            status:
                worstCvd >= CVD_TARGET
                    ? 'pass'
                    : worstCvd >= CVD_FLOOR
                      ? 'warn'
                      : 'fail',
            message:
                worstCvd >= CVD_TARGET
                    ? `Colour-blind safe (worst pair ΔE ${round(worstCvd)}).`
                    : worstCvd >= CVD_FLOOR
                      ? `Hard to tell apart with red-green colour blindness (ΔE ${round(worstCvd)}) — the labels carry it, but pick further apart if you can.`
                      : `These two are the same colour to a red-green colour-blind reader (ΔE ${round(worstCvd)}).`,
            culprits: worstCvdPair,
        });

        checks.push({
            id: 'normal',
            status: worstNormal >= NORMAL_FLOOR ? 'pass' : 'fail',
            message:
                worstNormal >= NORMAL_FLOOR
                    ? `All colours are distinct (worst pair ΔE ${round(worstNormal)}).`
                    : `Too similar to tell apart at a glance (ΔE ${round(worstNormal)}).`,
            culprits: worstNormalPair,
        });
    }

    const faint = valid.filter(color => contrastRatio(color, surface) < CONTRAST_MIN);
    checks.push({
        id: 'contrast',
        status: faint.length ? 'warn' : 'pass',
        message: faint.length
            ? 'Faint against the background — readable here only because every node is labelled.'
            : 'Every colour stands out against the background.',
        culprits: faint,
    });

    const status: TExoCheckStatus = checks.some(check => check.status === 'fail')
        ? 'fail'
        : checks.some(check => check.status === 'warn')
          ? 'warn'
          : 'pass';

    return { status, checks };
}
