const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
    className: 'class',
    htmlFor: 'for',
    acceptCharset: 'accept-charset',
    httpEquiv: 'http-equiv',
    xlinkHref: 'xlink:href',
};

const SVG_CAMEL_KEPT =
    /^(viewBox|preserveAspectRatio|gradientUnits|gradientTransform|patternUnits|patternContentUnits|patternTransform|clipPathUnits|maskUnits|maskContentUnits|markerUnits|markerWidth|markerHeight|refX|refY|textLength|lengthAdjust|startOffset|spreadMethod|stdDeviation|baseFrequency|numOctaves|kernelMatrix|tableValues|filterUnits|primitiveUnits|pathLength|attributeName|repeatCount)$/;

export function readExoReactAttributeName(name: string, svg: boolean): string {
    const mapped = ATTRIBUTE_NAMES[name];
    if (mapped !== undefined) return mapped;
    if (svg && /[A-Z]/.test(name) && !SVG_CAMEL_KEPT.test(name)) {
        return name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
    }
    return name;
}
