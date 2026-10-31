import { EXO_EXPECT_UNDECLARED } from './types/TExoConformanceRule';
import type { TExoConformanceExpectation } from './types/TExoConformanceRule';

// Nobody has established what this backend does. ALWAYS FAILS, printing the verdict the run made.
export const undeclared = (why: string): TExoConformanceExpectation => ({
    outcome: EXO_EXPECT_UNDECLARED,
    why,
});
