import { describe, it, expect } from 'vitest';
import { exoStyle } from '../exoStyle';

describe('exoStyle()', () => {
    it('camelCases keys to kebab-case', () => {
        expect(exoStyle({ backgroundColor: 'red', fontSize: 'inherit' })).toBe(
            'background-color:red;font-size:inherit'
        );
    });

    it('appends px to numeric length values', () => {
        expect(exoStyle({ fontSize: 12, padding: 8 })).toBe('font-size:12px;padding:8px');
    });

    it('leaves 0 without a unit', () => {
        expect(exoStyle({ margin: 0 })).toBe('margin:0');
    });

    it('does not add px to unitless properties', () => {
        expect(
            exoStyle({
                opacity: 0.5,
                zIndex: 10,
                lineHeight: 1.5,
                fontWeight: 700,
            })
        ).toBe('opacity:0.5;z-index:10;line-height:1.5;font-weight:700');
    });

    it('passes custom properties through untouched (no kebab, no px)', () => {
        expect(exoStyle({ '--gap': 8, '--brand': '#ec4899' })).toBe('--gap:8;--brand:#ec4899');
    });

    it('expands array values with per-item formatting', () => {
        expect(exoStyle({ padding: [4, 8], margin: ['auto', 0] })).toBe(
            'padding:4px 8px;margin:auto 0'
        );
    });

    it('skips null / undefined / false values (conditionals)', () => {
        expect(
            exoStyle({
                color: 'red',
                border: null,
                outline: undefined,
                display: false,
            })
        ).toBe('color:red');
    });

    it('accepts and appends raw string arguments', () => {
        expect(exoStyle('color:red', { fontSize: 12 })).toBe('color:red;font-size:12px');
        expect(exoStyle('color:red;')).toBe('color:red');
    });

    it('skips falsy arguments (conditional objects)', () => {
        const active = false;
        expect(exoStyle({ color: 'black' }, active && { color: 'blue' })).toBe('color:black');
    });

    it('merges multiple objects; later wins in the browser (appended last)', () => {
        expect(exoStyle({ color: 'black' }, { color: 'blue' })).toBe('color:black;color:blue');
    });

    it('returns an empty string for no/empty input', () => {
        expect(exoStyle()).toBe('');
        expect(exoStyle(null, undefined, false, {})).toBe('');
    });

    it('leaves already-kebab keys alone', () => {
        expect(exoStyle({ 'z-index': 5, 'background-color': 'blue' })).toBe(
            'z-index:5;background-color:blue'
        );
    });

    it('serializes explicit vendor prefixes (no autoprefixing)', () => {
        expect(
            exoStyle({
                WebkitTransform: 'scale(2)',
                MozAppearance: 'none',
                msFlexAlign: 'center',
                '-webkit-backdrop-filter': 'blur(4px)',
            })
        ).toBe(
            '-webkit-transform:scale(2);-moz-appearance:none;-ms-flex-align:center;-webkit-backdrop-filter:blur(4px)'
        );
    });
});
