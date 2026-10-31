import { describe, expect, it } from 'vitest';
import { act, useState } from 'react';
import { css, jsx } from '@emotion/react';
import { mountExoReactTree } from './helpers/mountExoReactTree';

const emotionCss = (): string =>
    Array.from(document.querySelectorAll('style[data-emotion]'))
        .map((style) => style.textContent ?? '')
        .join('');

describe('@emotion/react', () => {
    it('turns a css prop into a class backed by an inserted <style> and swaps it on change', async () => {
        let setColor: (color: string) => void = () => undefined;

        function Badge() {
            const [color, set] = useState('rgb(1, 2, 3)');
            setColor = set;
            return jsx('span', { css: css({ color }), id: 'badge' }, 'badge');
        }

        const { container, unmount } = await mountExoReactTree(<Badge />);
        const badge = container.querySelector('#badge') as HTMLElement;
        expect(badge.textContent).toBe('badge');
        expect(badge.hasAttribute('css')).toBe(false);
        const firstClass = badge.className;
        expect(firstClass).toMatch(/^css-/);
        expect(emotionCss()).toMatch(new RegExp(`\\.${firstClass}\\{color:rgb\\(1, ?2, ?3\\);?\\}`));

        await act(async () => {
            setColor('rgb(4, 5, 6)');
        });
        const secondClass = (container.querySelector('#badge') as HTMLElement).className;
        expect(secondClass).toMatch(/^css-/);
        expect(secondClass).not.toBe(firstClass);
        expect(emotionCss()).toMatch(new RegExp(`\\.${secondClass}\\{color:rgb\\(4, ?5, ?6\\);?\\}`));

        await unmount();
    });
});
