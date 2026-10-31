import { EXO_OUTCOME_CANNOT_EXPRESS } from './constants/EXO_OUTCOME_CANNOT_EXPRESS';
import type { TExoConformanceExpectation } from './types/TExoConformanceRule';

// No such concept, for want of the named capabilities. It takes ALL of them and a subset fails: a
// backend missing two is a different finding from one missing one. The set is derived from the
// subject, so naming a capability the subject does not need fails here.
export const cannotExpress = (...capabilities: string[]): TExoConformanceExpectation => ({
    outcome: EXO_OUTCOME_CANNOT_EXPRESS,
    capabilities,
});
