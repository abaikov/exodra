# Exodra Benchmarks

This private workspace contains browser benchmarks used while tuning Exodra.
They are not part of the published package set.

## Commands

```bash
npm run build --workspace=@exodra/benchmarks
npm run dev --workspace=@exodra/benchmarks
npm run bench --workspace=@exodra/benchmarks
```

`npm run bench` starts the Vite app, opens it in headless Chromium, runs the
benchmark suite, prints results, and stops the server.

## Covered Areas

- Conditional rendering
- List operations
- Bindable read/write operations
- Effect-like update patterns
- Advanced list mutations (`remove`, `move`, `set`, `insert`)
- Nested component trees
- Multiple reactive values
- Initial render and runtime construction strategies

## Output

Each result reports median, average, min, max, and operation count. Treat these
numbers as comparative development signals, not as a formal performance claim.

