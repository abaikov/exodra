import { EXO_OUTCOME_REFUSED } from './constants/EXO_OUTCOME_REFUSED';
import type { TExoConformanceExpectation } from './types/TExoConformanceRule';
import type { TExoConformanceStage } from './types/TExoConformanceVerdict';

// Threw, at a named LAYER. `matching` is for rules where the WORDS are the point and is left off
// everywhere else: holding backends to their sentences is how a suite fails on improvements.
export const refusesAt = (
    stage: TExoConformanceStage,
    matching?: RegExp
): TExoConformanceExpectation => ({ outcome: EXO_OUTCOME_REFUSED, stage, matching });
