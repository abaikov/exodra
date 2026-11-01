import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { abBench, type Scenario } from '../../../harness';
import { createLibraryListApp } from '../../apps/react-libraries/libraryList';

const line = (s: string): void => console.log(`✅ ${s}`);

type TLibraryRow = {
    readonly name: string;
    readonly usesReact: boolean;
    mount(container: HTMLElement): {
        advance(round: number): void;
        unmount(): void;
    };
};

const REACT_KEY = /^__react/;

function reactKeysUnder(container: HTMLElement): number {
    let found = 0;
    const nodes: Element[] = [container, ...Array.from(container.querySelectorAll('*'))];
    for (const node of nodes) for (const key of Object.keys(node)) if (REACT_KEY.test(key)) found++;
    return found;
}

function assertSameMarkup(rows: readonly TLibraryRow[]): void {
    const markup: string[][] = rows.map((row) => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const mounted = row.mount(container);
        const seen = [container.innerHTML];
        mounted.advance(0);
        seen.push(container.innerHTML);
        mounted.advance(1);
        seen.push(container.innerHTML);
        if (seen[1] === seen[0] || seen[2] === seen[1]) {
            throw new Error(
                `react-libraries: \`${row.name}\` did not change its markup inside a round — ` +
                    'the update would be timed without being committed.'
            );
        }
        const reactKeys = reactKeysUnder(container);
        if (row.usesReact !== reactKeys > 0) {
            throw new Error(
                `react-libraries: \`${row.name}\` ${
                    row.usesReact ? 'left no' : 'left'
                } React internals ` +
                    `(${reactKeys}) on its nodes — the row is not rendered by what its name says.`
            );
        }
        mounted.unmount();
        container.remove();
        return seen;
    });
    for (let at = 1; at < rows.length; at++) {
        for (let step = 0; step < markup[0].length; step++) {
            if (markup[at][step] !== markup[0][step]) {
                throw new Error(
                    `react-libraries: \`${rows[at].name}\` differs from \`${rows[0].name}\` at step ${step}.`
                );
            }
        }
        line(
            `gate react-libraries/${rows[at].name}: identical markup to ${rows[0].name} at mount and after two rounds`
        );
    }
}

export async function benchmarkReactLibraries(rounds = 100, batch = 20): Promise<void> {
    const regionRounds = Math.max(1, batch);
    const compat = await import('@exodra/react-compat');
    const compatClient = await import('@exodra/react-compat/client');
    const { createLibraryListApp: createCompatApp } = await import(
        '../../apps/react-libraries/libraryList.ts?impl=compat'
    );
    const { createLibraryListJsxApp } = await import(
        '../../apps/react-libraries/libraryListJsx.jsx'
    );

    const rows: TLibraryRow[] = [
        {
            name: 'react',
            usesReact: true,
            mount(container) {
                const built = createLibraryListApp();
                const root = createRoot(container);
                flushSync(() => root.render(built.app as never));
                return {
                    advance: (round) => flushSync(() => built.advance(round)),
                    unmount: () => root.unmount(),
                };
            },
        },
        {
            name: 'reactCompat',
            usesReact: false,
            mount(container) {
                const built = createCompatApp();
                const root = compatClient.createRoot(container);
                compat.flushSync(() => root.render(built.app as never));
                return {
                    advance: (round) => compat.flushSync(() => built.advance(round)),
                    unmount: () => root.unmount(),
                };
            },
        },
        {
            name: 'reactCompatJsx',
            usesReact: false,
            mount(container) {
                const built = createLibraryListJsxApp();
                const root = compatClient.createRoot(container);
                compat.flushSync(() => root.render(built.app as never));
                return {
                    advance: (round) => compat.flushSync(() => built.advance(round)),
                    unmount: () => root.unmount(),
                };
            },
        },
    ];

    assertSameMarkup(rows);

    const prepare = (row: TLibraryRow) => (): Scenario => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const mounted = row.mount(container);
        let round = 0;
        return {
            measure: () => {
                for (let k = 0; k < regionRounds; k++) mounted.advance(round++);
            },
            cleanup: () => {
                mounted.unmount();
                container.remove();
            },
        };
    };

    await abBench(
        `REACT LIBRARIES — 200 rows, each reading a zustand selector and a react-query query; ` +
            `${regionRounds} rounds of 40 store writes and 40 setQueryData per region`,
        `ms/${regionRounds} rounds`,
        {
            react: prepare(rows[0]),
            reactCompat: prepare(rows[1]),
            reactCompatJsx: prepare(rows[2]),
        } as never,
        { rounds }
    );
}
