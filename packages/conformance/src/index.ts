// The cross-backend conformance suite. See README.md — in particular the blind spots of the
// artefact, and the fact that every expectation here was derived by READING, never by running.

export { assertExoConformanceRule } from './assertExoConformanceRule';
export {
    runExoConformanceRule,
    describeExoConformanceRun,
    describeVerdict,
} from './runExoConformanceRule';
export { renders } from './renders';
export { refusesAt } from './refusesAt';
export { cannotExpress } from './cannotExpress';
export { undeclared } from './undeclared';
export {
    exoConformanceClassOf,
    exoConformancePartition,
    canonicalExoPartition,
    describeExoPartition,
} from './exoConformanceClassOf';
export { exoConformanceTrees, exoConformanceTreeNames } from './exoConformanceTrees';
export { exoDomAdapter } from './adapters/exoDomAdapter';
export { exoStrAdapter } from './adapters/exoStrAdapter';
export { exoTermAdapter } from './adapters/exoTermAdapter';
export { exoHydrateAdapter } from './adapters/exoHydrateAdapter';
export { EXO_CAP_ELEMENT } from './constants/EXO_CAP_ELEMENT';
export { EXO_CAP_UPDATE } from './constants/EXO_CAP_UPDATE';
export { EXO_CAP_LIVE_TREE } from './constants/EXO_CAP_LIVE_TREE';
export { EXO_CAP_TEXT_NODE } from './constants/EXO_CAP_TEXT_NODE';
export { EXO_CONFORMANCE_CAPABILITIES } from './constants/EXO_CONFORMANCE_CAPABILITIES';
export { EXO_OUTCOME_RENDERED } from './constants/EXO_OUTCOME_RENDERED';
export { EXO_OUTCOME_REFUSED } from './constants/EXO_OUTCOME_REFUSED';
export { EXO_OUTCOME_CANNOT_EXPRESS } from './constants/EXO_OUTCOME_CANNOT_EXPRESS';
export { EXO_STAGE_SCHEMA_COMPILE } from './constants/EXO_STAGE_SCHEMA_COMPILE';
export { EXO_STAGE_WIRE } from './constants/EXO_STAGE_WIRE';
export { EXO_STAGE_UPDATE } from './constants/EXO_STAGE_UPDATE';
// A new adapter must reuse one of these three walks; writing a fourth is how two backends stop
// being comparable.
export { exoSketchOfElement, exoSketchOfChildren } from './exoSketchOfElement';
export { exoSketchOfMarkup } from './exoSketchOfMarkup';
export { exoSketchOfTermNode, exoSketchOfTermRoots } from './exoSketchOfTermNode';
export { translateFirstExoText } from './translateFirstExoText';

export type {
    TExoConformanceAdapter,
    TExoConformanceMachine,
    TExoConformanceRun,
} from './types/TExoConformanceAdapter';
export type {
    TExoConformanceRule,
    TExoConformanceExpectation,
    TExoConformanceSubject,
} from './types/TExoConformanceRule';
export type { TExoConformanceVerdict, TExoConformanceStage } from './types/TExoConformanceVerdict';
export { EXO_EXPECT_UNDECLARED } from './types/TExoConformanceRule';
