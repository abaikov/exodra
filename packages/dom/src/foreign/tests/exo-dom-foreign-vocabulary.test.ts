// @vitest-environment jsdom
import { composeExoPlugins } from '@exodra/core';
import type { TExoChildrenPort, TExoMachineInitialState } from '@exodra/core';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { describe, expect, it } from 'vitest';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '../../dom/EXO_DOM_NODE_VOCABULARY';
import { EXO_DOM_FOREIGN_VOCABULARY } from '../constants/EXO_DOM_FOREIGN_VOCABULARY';
import { exoForeignNode } from '../exoForeignNode';
import type { TExoDomForeignApi } from '../types/TExoDomForeignApi';

const BACKEND = composeExoPlugins(withExoCompiler(new ExoDomBackend()), EXO_DOM_FOREIGN_VOCABULARY);

describe('foreign is a pack on the DOM backend', () => {
    it('places what createDom built, through the child list the wire opened', () => {
        const canvas = document.createElement('canvas');
        const CHART = createExoTestMachine(
            (b) => {
                let slot!: TExoChildrenPort;
                b.el('div', { class: 'chart' }, (div) => {
                    slot = div.childrenPort();
                });
                return { slot };
            },
            (P): TExoMachineInitialState<TExoDomNode & TExoDomForeignApi> =>
                (c) => {
                    c.appendChild(
                        P.slot,
                        c.foreign({ createDom: (self) => exoForeignNode(self, canvas) })
                    );
                }
        );
        const parent = host();

        BACKEND.render(CHART, parent);

        expect(parent.innerHTML).toBe('<div class="chart"><canvas></canvas></div>');
        expect(parent.querySelector('canvas')).toBe(canvas);
    });

    it('is absent from a backend that did not compose it', () => {
        expect('foreign' in new ExoDomBackend()).toBe(false);
        expect('foreign' in BACKEND).toBe(true);
    });
});
