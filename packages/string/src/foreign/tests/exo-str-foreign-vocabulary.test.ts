import { composeExoPlugins } from '@exodra/core';
import type { TExoChildrenPort, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoStrBackend } from '../../node/ExoStrBackend';
import type { TExoStrNode } from '../../node/EXO_STR_NODE_VOCABULARY';
import { exoForeignMarkup } from '../../markup/exoForeignMarkup';
import { EXO_STR_FOREIGN_VOCABULARY } from '../constants/EXO_STR_FOREIGN_VOCABULARY';
import type { TExoStrForeignApi } from '../types/TExoStrForeignApi';
import { createExoTestMachine } from '@exodra/test-utils';

const BACKEND = composeExoPlugins(new ExoStrBackend(), EXO_STR_FOREIGN_VOCABULARY);

describe('foreign is a pack on the string backend', () => {
    it('prints what createStr returned, in the child list the wire opened', () => {
        const CHART = createExoTestMachine(
            (b) => {
                let slot!: TExoChildrenPort;
                b.el('div', { class: 'chart' }, (div) => {
                    slot = div.childrenPort();
                });
                return { slot };
            },
            (P): TExoMachineInitialState<TExoStrNode & TExoStrForeignApi> =>
                (c) => {
                    c.appendChild(
                        P.slot,
                        c.foreign({ createStr: () => exoForeignMarkup('<canvas></canvas>') })
                    );
                }
        );

        expect(BACKEND.render(CHART)).toBe('<div class="chart"><canvas></canvas></div>');
    });

    it('is absent from a backend that did not compose it', () => {
        expect('foreign' in new ExoStrBackend()).toBe(false);
        expect('foreign' in BACKEND).toBe(true);
    });
});
