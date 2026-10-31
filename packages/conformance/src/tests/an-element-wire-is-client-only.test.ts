// @vitest-environment jsdom
import type { TExoChildrenPort, TExoTextPort, TExoMachineInitialState } from '@exodra/core';
import { ExoDomBackend, exoNodeDom, withExoCompiler, withExoChildList } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';
import { describe, expect, it } from 'vitest';
import { createExoTestMachine } from '@exodra/test-utils';

const ROW = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('li', null, (li) => {
            label = li.textPort();
        });
        return { label };
    },
    (P): TExoMachineInitialState<TExoDomNode> =>
        (c) => {
            c.text(P.label, 'row');
        }
);

const LIST = createExoTestMachine(
    (b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    },
    (P): TExoMachineInitialState<TExoDomNode> =>
        (c) => {
            const row = c.build(ROW);
            exoNodeDom(row).node.setAttribute('data-touched', '');
            c.childList(P.rows).insert(row);
        }
);

describe('a wire that reaches for an element is a client-side wire', () => {
    it('renders in the browser', () => {
        const parent = document.createElement('div');
        withExoChildList(withExoCompiler(new ExoDomBackend())).render(LIST, parent);
        expect(parent.innerHTML).toBe('<ul><li data-touched="">row</li></ul>');
    });

    it('throws on the server, at the exoNodeDom call, during the render', () => {
        const server = new ExoStrBackend();
        expect(() => server.render(LIST as unknown as Parameters<typeof server.render>[0])).toThrow(
            /not built by c\.build/
        );
    });
});
