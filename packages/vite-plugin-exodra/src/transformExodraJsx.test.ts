// Guarantees the Vite plugin compiles Exodra JSX with the REAL Exodra transform
// (@exodra/babel-plugin-jsx), not esbuild's classic jsxFactory mode. The classic
// mode would emit children as positional args (clobbering Exodra's cacheKey slot)
// and ignore directives; these tests lock in the correct bucketed output.

import { describe, it, expect } from 'vitest';
import { transformExodraJsx } from './transformExodraJsx';

describe('transformExodraJsx', () => {
    it('compiles typed-bucket TSX to bucketed h() and strips TS types', async () => {
        const input = `
const label: string = 'hi';
export const view = (
  <div static={{ id: 'x' }} handlers={{ onClick: handler }}>
    {count}
  </div>
);
`;
        const out = (await transformExodraJsx(input, '/app/View.tsx'))?.code ?? '';

        expect(out).toContain('h("div"');
        expect(out).toContain('static:');
        expect(out).toContain('handlers:');
        // The expression child lands INSIDE a bucket, never as a positional arg.
        expect(out).toContain('children: count');
        // TS type annotation removed.
        expect(out).toContain("const label = 'hi'");
        expect(out).not.toContain(': string');
        // No foreign JSX runtime injected.
        expect(out).not.toMatch(/react|jsx-runtime/i);
    });

    it('keeps handlers in the handlers bucket', async () => {
        const input = `export const b = <button handlers={{ onClick: f }}>Go</button>;`;
        const out = (await transformExodraJsx(input, '/app/B.tsx'))?.code ?? '';
        expect(out).toContain('handlers:');
        expect(out).toContain('h("button"');
    });

    it('throws on flat React-style attributes (strict)', async () => {
        const input = `export const x = <div class="foo" />;`;
        await expect(
            transformExodraJsx(input, '/app/X.tsx')
        ).rejects.toThrow(/flat attribute "class" is not allowed/);
    });

    it('parses namespaced directives without throwing', async () => {
        const input = `export const f = <input bind:value={model} />;`;
        const out = (await transformExodraJsx(input, '/app/F.tsx'))?.code ?? '';
        expect(out).toContain('h("input"');
    });
});
