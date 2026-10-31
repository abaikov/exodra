import { composeExoPlugins } from '@exodra/core';
import type { TExoNode } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoTermBackend } from '../../backend/ExoTermBackend';
import type { TExoTermMark } from '../../rendering/types/TExoTermMark';
import { EXO_TERM_FOREIGN_VOCABULARY } from '../constants/EXO_TERM_FOREIGN_VOCABULARY';

describe('foreign is a pack on the term backend', () => {
    it('hands back what createTerm built', () => {
        const backend = composeExoPlugins(new ExoTermBackend(), EXO_TERM_FOREIGN_VOCABULARY);
        const built = {} as TExoNode<TExoTermMark>;

        expect(backend.foreign({ createTerm: () => built })).toBe(built);
    });

    it('is absent from a backend that did not compose it', () => {
        expect('foreign' in new ExoTermBackend()).toBe(false);
    });
});
