import type { TExoStrMarkupFiller } from '../types/TExoStrMarkupFiller';

// One expression dropping an instance's values into the holes between the static markup.
//
// THE WRITTEN-OUT ARITY LADDER IS GONE, AND IT WAS NOT NEUTRAL — IT LOST. `bench:fill-markup`
// against the loop below, medians in ns per call, per-round scatter in brackets:
//
//     inside the ladder   loop 162.2   ladder 176.1   [1.25]
//     ports·9             loop 183.5   ladder 189.2   [1.95]
//     ports·16            loop 282.0   ladder 290.3   [2.11]
//
// The loop won every scene by 6–14 ns, many times the scatter, and the ladder was never once the
// fastest row. The two lower scenes are the sharp ones: past nine pieces the old code ran THIS
// loop, byte for byte, and still measured ~3% behind a loop that is the function's only body —
// which is the cost of a factory with ten return sites rather than of the branch itself.
//
// COPIED: a caller mutating the array it passed cannot change rendered pages.
// `order` is `exoMarkupFillOrder`'s answer: `null` keeps the straight indexed loop.
export function createExoMarkupFiller(
    pieces: readonly string[],
    order: readonly number[] | null = null
): TExoStrMarkupFiller {
    const parts = pieces.slice();
    const ports = parts.length - 1;
    if (order !== null) {
        const at = order.slice();
        return (v) => {
            let html = parts[0];
            for (let k = 0; k < ports; k++) {
                html += v[at[k]];
                html += parts[k + 1];
            }
            return html;
        };
    }
    return (v) => {
        let html = parts[0];
        // Two `+=` rather than `html += v[i] + parts[i + 1]`: the second builds a pair thrown away
        // the moment it is appended. The same bench prices `join` at 1.43–1.52× this.
        for (let i = 0; i < ports; i++) {
            html += v[i];
            html += parts[i + 1];
        }
        return html;
    };
}
