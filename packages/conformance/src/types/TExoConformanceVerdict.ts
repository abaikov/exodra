import type { EXO_OUTCOME_CANNOT_EXPRESS } from '../constants/EXO_OUTCOME_CANNOT_EXPRESS';
import type { EXO_OUTCOME_REFUSED } from '../constants/EXO_OUTCOME_REFUSED';
import type { EXO_OUTCOME_RENDERED } from '../constants/EXO_OUTCOME_RENDERED';
import type { EXO_STAGE_SCHEMA_COMPILE } from '../constants/EXO_STAGE_SCHEMA_COMPILE';
import type { EXO_STAGE_UPDATE } from '../constants/EXO_STAGE_UPDATE';
import type { EXO_STAGE_WIRE } from '../constants/EXO_STAGE_WIRE';

// Where a refusal came from.
export type TExoConformanceStage =
    | typeof EXO_STAGE_SCHEMA_COMPILE
    | typeof EXO_STAGE_WIRE
    | typeof EXO_STAGE_UPDATE;

// What one backend actually DID — observed, never declared. Anything a verdict carries that
// `exoConformanceClassOf` does not read is EVIDENCE for the failure output and never decides
// whether two backends agree.
export type TExoConformanceVerdict =
    | {
          readonly outcome: typeof EXO_OUTCOME_RENDERED;
          readonly sketch: string;
      }
    | {
          readonly outcome: typeof EXO_OUTCOME_REFUSED;
          readonly stage: TExoConformanceStage;
          // Evidence only. Two refusals with different words at the same stage are one class.
          readonly message: string;
      }
    | {
          readonly outcome: typeof EXO_OUTCOME_CANNOT_EXPRESS;
          // EVERY capability the rule needs that the backend does not declare, not the first found:
          // a backend can lack two at once, and reporting one would make the recorded reason a
          // function of the derivation's order. In `EXO_CONFORMANCE_CAPABILITIES` order, so the
          // same absence always prints the same way.
          readonly capabilities: readonly string[];
      };
