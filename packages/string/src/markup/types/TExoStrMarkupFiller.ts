// The second half of a render, in one expression. The word "fill" is load-bearing: `CENSUS/+fill`
// is the key pricing it in `packages/benchmarks/measurements/ssr-floor.published.json`.
export type TExoStrMarkupFiller = (values: readonly string[]) => string;
