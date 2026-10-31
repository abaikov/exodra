/**
 * EVERY BACKEND THAT MOVES DOM NODES USES THIS ONE: two placement passes are interchangeable only
 * if they keep the same set of rows in place, so an approximation shows up as a hydrated page whose
 * DOM differs from a rendered one after a shuffle. Move counts once quoted here are WITHDRAWN —
 * see the README, "Withdrawn numbers".
 */
export function getExoSequence(arr: number[]): number[] {
    const p = arr.slice();
    const result: number[] = [0];
    const len = arr.length;
    let i: number, j: number, u: number, v: number, c: number;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) u = c + 1;
                else v = c;
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) p[i] = result[u - 1];
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}
