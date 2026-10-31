import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { mountExoReactTree } from './helpers/mountExoReactTree';

function Row({ index, style }: RowComponentProps) {
    return (
        <div className="row" style={style}>
            Row {index}
        </div>
    );
}

describe('react-window', () => {
    it('renders only the rows in view and shifts the window on scroll', async () => {
        const { container, unmount } = await mountExoReactTree(
            <List rowComponent={Row} rowCount={1000} rowHeight={20} rowProps={{}} style={{ height: 100 }} />
        );
        const rows = () => Array.from(container.querySelectorAll('.row')).map((row) => row.textContent);
        const initial = rows();
        expect(initial[0]).toBe('Row 0');
        expect(initial.length).toBeGreaterThanOrEqual(5);
        expect(initial.length).toBeLessThan(20);

        const list = container.firstElementChild as HTMLElement;
        Object.defineProperty(list, 'scrollTop', { configurable: true, value: 400 });
        await act(async () => {
            list.dispatchEvent(new Event('scroll'));
        });
        const scrolled = rows();
        expect(scrolled).toContain('Row 20');
        expect(scrolled).not.toContain('Row 0');
        expect(scrolled.length).toBeLessThan(20);

        await unmount();
    });
});
