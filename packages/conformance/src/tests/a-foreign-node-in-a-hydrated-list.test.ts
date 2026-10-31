// @vitest-environment jsdom
import { composeExoPlugins } from '@exodra/core';
import type { TExoChildrenPort, TExoTextPort, TExoMachineInitialState } from '@exodra/core';
import {
    EXO_DOM_FOREIGN_VOCABULARY,
    ExoDomBackend,
    exoForeignNode,
    withExoCompiler,
    withExoHydration,
    withExoChildList,
} from '@exodra/dom';
import type { TExoDomForeignApi, TExoDomNode } from '@exodra/dom';
import { EXO_STR_FOREIGN_VOCABULARY, ExoStrBackend, exoForeignMarkup } from '@exodra/string';
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
    (P): TExoMachineInitialState<TExoDomNode & TExoDomForeignApi> =>
        (c) => {
            const list = c.childList(P.rows);
            list.insert(
                c.foreign({
                    createDom: (self) => exoForeignNode(self, document.createElement('canvas')),
                    createStr: () => exoForeignMarkup('<canvas></canvas>'),
                } as Parameters<typeof c.foreign>[0])
            );
            list.insert(c.build(ROW));
        }
);

const LIST_WITH_DIRECT_FOREIGN = createExoTestMachine(
    (b) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    },
    (P): TExoMachineInitialState<TExoDomNode> =>
        (c) => {
            const list = c.childList(P.rows);
            list.insert(exoForeignNode(c, document.createElement('canvas')));
            list.insert(c.build(ROW));
        }
);

describe('a foreign node in a hydrated child list', () => {
    it('leaves the page the client would have rendered', () => {
        const server = composeExoPlugins(new ExoStrBackend(), EXO_STR_FOREIGN_VOCABULARY);
        const html = server.render(LIST as unknown as Parameters<typeof server.render>[0]);
        expect(html).toBe('<ul><canvas></canvas><li>row</li></ul>');

        const parent = document.createElement('div');
        document.body.appendChild(parent);
        parent.innerHTML = html;
        const client = composeExoPlugins(
            withExoHydration(withExoChildList(withExoCompiler(new ExoDomBackend()))),
            EXO_DOM_FOREIGN_VOCABULARY
        );
        client.hydrate(LIST, parent);

        expect(parent.innerHTML).toBe('<ul><canvas></canvas><li>row</li></ul>');
    });

    it('takes its row when exoForeignNode is called directly, not through c.foreign', () => {
        const server = composeExoPlugins(new ExoStrBackend(), EXO_STR_FOREIGN_VOCABULARY);
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        parent.innerHTML = server.render(LIST as unknown as Parameters<typeof server.render>[0]);
        const client = withExoHydration(withExoChildList(withExoCompiler(new ExoDomBackend())));
        client.hydrate(LIST_WITH_DIRECT_FOREIGN, parent);

        expect(parent.innerHTML).toBe('<ul><canvas></canvas><li>row</li></ul>');
        expect(parent.querySelector('canvas')).not.toBeNull();
    });

    it('names the missing pack when the hydrating backend did not compose it', () => {
        const server = composeExoPlugins(new ExoStrBackend(), EXO_STR_FOREIGN_VOCABULARY);
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        parent.innerHTML = server.render(LIST as unknown as Parameters<typeof server.render>[0]);
        const bare = withExoHydration(withExoChildList(withExoCompiler(new ExoDomBackend())));

        expect(() =>
            bare.hydrate(LIST as unknown as Parameters<typeof bare.hydrate>[0], parent)
        ).toThrow(/EXO_DOM_FOREIGN_VOCABULARY/);
    });
});
