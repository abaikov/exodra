export const now = (): number => {
    const perf = (globalThis as { performance?: { now?: () => number } }).performance;
    return perf && typeof perf.now === 'function' ? perf.now() : Date.now();
};
