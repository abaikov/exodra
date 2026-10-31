import { describe, expect, it } from 'vitest';
import { act, useState } from 'react';
import styled from 'styled-components';
import { mountExoReactTree } from './helpers/mountExoReactTree';

const Button = styled.button<{ $primary?: boolean }>`
    color: ${(props) => (props.$primary ? 'red' : 'blue')};
`;

const styledCss = (): string =>
    Array.from(document.querySelectorAll('style[data-styled]'))
        .map((style) => style.textContent ?? '')
        .join('');

describe('styled-components', () => {
    it('renders a styled element whose class maps to an inserted rule, and restyles on a prop change', async () => {
        let setPrimary: (primary: boolean) => void = () => undefined;

        function App() {
            const [primary, set] = useState(false);
            setPrimary = set;
            return <Button $primary={primary}>save</Button>;
        }

        const { container, unmount } = await mountExoReactTree(<App />);
        const button = container.querySelector('button') as HTMLButtonElement;
        expect(button.textContent).toBe('save');
        expect(button.hasAttribute('$primary')).toBe(false);
        const blueClass = button.classList[button.classList.length - 1];
        expect(styledCss()).toContain(`.${blueClass}{color:blue;}`);

        await act(async () => {
            setPrimary(true);
        });
        const redClass = button.classList[button.classList.length - 1];
        expect(redClass).not.toBe(blueClass);
        expect(styledCss()).toContain(`.${redClass}{color:red;}`);
        expect(container.querySelector('button')).toBe(button);

        await unmount();
    });
});
