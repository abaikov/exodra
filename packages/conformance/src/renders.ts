import { EXO_OUTCOME_RENDERED } from './constants/EXO_OUTCOME_RENDERED';
import type { TExoConformanceExpectation } from './types/TExoConformanceRule';

export const renders = (): TExoConformanceExpectation => ({ outcome: EXO_OUTCOME_RENDERED });
