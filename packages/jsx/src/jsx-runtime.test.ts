import { describe, expect, it } from 'vitest';
import { Fragment } from './jsx-runtime';
import * as index from './index';

// The JSX *transform* is done by @exodra/babel-plugin-jsx (JSX → h() calls), so the
// runtime surface of @exodra/jsx is just the Fragment marker. (Its real weight is
// types — the JSX namespace / handler inference — guarded in the type-tests package.)
describe('jsx-runtime', () => {
    it('Fragment is the shared, cross-realm `exodra.fragment` symbol', () => {
        expect(typeof Fragment).toBe('symbol');
        expect(Fragment).toBe(Symbol.for('exodra.fragment'));
    });

    it('re-exports Fragment from the package index', () => {
        expect((index as { Fragment?: symbol }).Fragment).toBe(Fragment);
    });
});
