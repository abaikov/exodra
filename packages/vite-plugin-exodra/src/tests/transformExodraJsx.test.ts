// Guarantees the Vite plugin compiles Exodra JSX with the REAL Exodra transform
// (@exodra/babel-plugin-schema), not esbuild's own JSX handling, which would lower each element to
// a runtime call and throws on the namespaced on: outright.

import { describe, it, expect } from 'vitest';
import { transformExodraJsx } from '../transformExodraJsx';

describe('transformExodraJsx', () => {
    it('compiles a declaration to a hoisted named schema and strips TS types', async () => {
        const input = `
const label: string = 'hi';
export const ROW = exoJsx<{ id: unknown; title: unknown }>(($) => (
  <li class="row" data-id={$.id}>
    <span>{$.title}</span>
  </li>
));
`;
        const out = (await transformExodraJsx(input, '/app/View.tsx'))?.code ?? '';
        expect(out).toContain('import { createExoNamedSchema } from "@exodra/core"');
        expect(out).toContain('.port("data-id", "id")');
        expect(out).toContain('.textPort("title")');
        expect(out).toContain("const label = 'hi'");
        expect(out).not.toContain(': string');
        expect(out).not.toMatch(/react|jsx-runtime/i);
    });

    it('lowers on: to a named event port', async () => {
        const input = `export const B = exoJsx(($) => <button class="b" on:click={$.go} />);`;
        const out = (await transformExodraJsx(input, '/app/B.tsx'))?.code ?? '';
        expect(out).toContain('.eventPort("click", "go")');
    });

    it('refuses JSX outside a declaration', async () => {
        const input = `export const x = <div class="foo" />;`;
        await expect(transformExodraJsx(input, '/app/X.tsx')).rejects.toThrow(/cannot be compiled/);
    });
});
