/** The smallest non-zero step this process's `performance.now()` was seen to take. A difference
 * under it is not a result, and the run says so rather than ranking on it. */
export function exoBenchClockGrainMs(): number {
    let grain = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 500; i++) {
        const start = performance.now();
        let next = performance.now();
        let spins = 0;
        while (next === start && spins < 100000) {
            next = performance.now();
            spins++;
        }
        const step = next - start;
        if (step > 0 && step < grain) grain = step;
    }
    return grain === Number.POSITIVE_INFINITY ? 0 : grain;
}
