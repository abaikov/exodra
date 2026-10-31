import type { EXO_OUTCOME_CANNOT_EXPRESS } from '../constants/EXO_OUTCOME_CANNOT_EXPRESS';
import type { EXO_OUTCOME_REFUSED } from '../constants/EXO_OUTCOME_REFUSED';
import type { EXO_OUTCOME_RENDERED } from '../constants/EXO_OUTCOME_RENDERED';
import type { TExoConformanceMachine } from './TExoConformanceAdapter';
import type { TExoConformanceStage } from './TExoConformanceVerdict';

// An expectation nobody has recorded yet.
export const EXO_EXPECT_UNDECLARED = 'UNDECLARED';

// `UNDECLARED` is an expectation, never an outcome, and it ALWAYS FAILS: not a skip, not an
// `it.fails`, not a snapshot, but a failure carrying the verdict the run produced.
export type TExoConformanceExpectation =
    | { readonly outcome: typeof EXO_OUTCOME_RENDERED }
    | {
          readonly outcome: typeof EXO_OUTCOME_REFUSED;
          readonly stage: TExoConformanceStage;
          // Held to the WORDS only where the words are the point.
          readonly matching?: RegExp;
      }
    | {
          readonly outcome: typeof EXO_OUTCOME_CANNOT_EXPRESS;
          // EVERY capability this backend is missing and no others — exactly the set the runner
          // derived from the subject. A subset is a failure, not a shorthand.
          readonly capabilities: readonly string[];
      }
    | { readonly outcome: typeof EXO_EXPECT_UNDECLARED; readonly why: string };

// Built FRESH per backend: a source at module scope would hand the second backend a cell the first
// had already subscribed to and moved, making the reported divergence an artefact of run order.
export type TExoConformanceSubject = {
    readonly component: TExoConformanceMachine;
    readonly instances?: number;
    // Pulled AFTER the render and BEFORE the artefact is read. DERIVES `EXO_CAP_UPDATE`.
    readonly update?: () => void;
    // Delivered to instance 0's root after `update`. DERIVES `EXO_CAP_LIVE_TREE`.
    readonly fire?: string;
    // Wrap the first Text node in a third party's `<font>`. DERIVES `EXO_CAP_TEXT_NODE`.
    readonly translate?: boolean;
};

// A rule cannot NAME a capability it needs: a declaration nothing compares against the SUBJECT
// excuses a backend from a rule that asked it nothing. So `expect` is all a rule declares, and it
// must name every registered backend exactly once — add an adapter and every rule fails by name.
export type TExoConformanceRule = {
    readonly name: string;
    subject(): TExoConformanceSubject;
    // DOM properties printed into the artefact. DERIVES `EXO_CAP_ELEMENT`.
    readonly probe?: readonly string[];
    // One entry per registered backend. Missing or extra keys fail the rule.
    readonly expect: Readonly<Record<string, TExoConformanceExpectation>>;
    // One inner array per equivalence class of artefact: one class is AGREE, two a recorded
    // DIVERGENCE. Settling the semantics merges the classes and fails this by name, so the fix does
    // not read as a regression. Backends that REFUSE are asserted by their expectation instead.
    readonly agreement: readonly (readonly string[])[];
};
