import { EXO_OUTCOME_CANNOT_EXPRESS } from './constants/EXO_OUTCOME_CANNOT_EXPRESS';
import { EXO_OUTCOME_REFUSED } from './constants/EXO_OUTCOME_REFUSED';
import { EXO_OUTCOME_RENDERED } from './constants/EXO_OUTCOME_RENDERED';
import { describeExoPartition, exoConformancePartition } from './exoConformanceClassOf';
import { exoConformanceTreeNames, exoConformanceTrees } from './exoConformanceTrees';
import {
    describeExoConformanceRun,
    describeVerdict,
    runExoConformanceRule,
} from './runExoConformanceRule';
import { EXO_EXPECT_UNDECLARED } from './types/TExoConformanceRule';
import type { TExoConformanceRule } from './types/TExoConformanceRule';

// Four assertions in the order below, because each makes the next meaningful. It throws plain
// errors and imports no test framework, so the same rules run from a script or a different runner.
export function assertExoConformanceRule(rule: TExoConformanceRule): void {
    const where = rule.name;

    // 1. COMPLETENESS, before anything is rendered, so a failure names the missing key.
    const declared = Object.keys(rule.expect).sort();
    if (declared.join(',') !== exoConformanceTreeNames.join(',')) {
        const missing = exoConformanceTreeNames.filter((name) => !declared.includes(name));
        const extra = declared.filter((name) => !exoConformanceTreeNames.includes(name));
        throw new Error(
            `${where}: this rule does not state what every registered backend does.\n` +
                (missing.length > 0 ? `  MISSING: ${missing.join(', ')}\n` : '') +
                (extra.length > 0 ? `  NOT A REGISTERED BACKEND: ${extra.join(', ')}\n` : '') +
                '  A rule is complete or it is nothing: an unstated backend is a backend nothing ' +
                'is checking. If a backend was just added to `exoConformanceTrees`, this is ' +
                'the message every rule in the suite is giving you, and each one wants an answer ' +
                'rather than a default.'
        );
    }

    const verdicts = runExoConformanceRule(rule);
    const table = '\nWHAT THE BACKENDS ACTUALLY DID:\n' + describeExoConformanceRun(verdicts);

    // 2. THE PER-BACKEND OUTCOME.
    const undeclared: string[] = [];
    const unrecorded: string[] = [];
    for (const adapter of exoConformanceTrees) {
        const expected = rule.expect[adapter.name];
        const actual = verdicts.get(adapter.name);
        if (actual === undefined) throw new Error(`${where}: ${adapter.name} produced no verdict`);

        if (expected.outcome === EXO_EXPECT_UNDECLARED) {
            unrecorded.push(adapter.name);
            undeclared.push(
                `  ${adapter.name} (${adapter.pkg}) — ${expected.why}\n` +
                    `    OBSERVED: ${describeVerdict(actual)}`
            );
            continue;
        }

        if (expected.outcome === EXO_OUTCOME_CANNOT_EXPRESS) {
            // BOTH DIRECTIONS: the rule CLAIMS the absence, the adapter DECLARES it, and the run
            // derived the outcome from the adapter alone — so a mismatch is the two coming apart.
            const declaredAnyway = expected.capabilities.filter((capability) =>
                adapter.can.has(capability)
            );
            if (declaredAnyway.length > 0) {
                throw new Error(
                    `${where}: the rule says ${adapter.name} cannot express this for want of ` +
                        `"${declaredAnyway.join('", "')}" — and ${adapter.pkg} DECLARES that. ` +
                        'One of the two is wrong: either the adapter now has the concept and the ' +
                        'rule should state what it does with it, or the capability was declared ' +
                        'in error.' +
                        table
                );
            }
            if (actual.outcome !== EXO_OUTCOME_CANNOT_EXPRESS) {
                throw new Error(
                    `${where}: ${adapter.name} was expected to be unable to express this and ` +
                        `instead it ran.\n  OBSERVED: ${describeVerdict(actual)}` +
                        table
                );
            }
            // THE WHOLE SET, NOT A SUBSET. The observed set is derived from the rule's SUBJECT, so
            // this also catches a rule excusing a backend from a question it never asked.
            const ruleSays = Array.from(expected.capabilities).sort().join(', ');
            const runSays = Array.from(actual.capabilities).sort().join(', ');
            if (ruleSays !== runSays) {
                throw new Error(
                    `${where}: ${adapter.name} cannot express this, but not for the reasons the ` +
                        `rule states.\n  RULE SAYS MISSING: ${ruleSays}\n` +
                        `  RUN SAYS MISSING:  ${runSays}\n` +
                        '  Two absences are not one absence; see `EXO_CAP_TEXT_NODE` for the case ' +
                        'this distinction exists for. A capability in the RULE and not in the RUN ' +
                        'is the serious direction: the rule is excusing this backend for something ' +
                        'its own subject never asks for, which is a green that states nothing.' +
                        table
                );
            }
            continue;
        }

        if (expected.outcome === EXO_OUTCOME_REFUSED) {
            if (actual.outcome !== EXO_OUTCOME_REFUSED) {
                throw new Error(
                    `${where}: ${adapter.name} was expected to REFUSE at ${expected.stage} and ` +
                        `did not.\n  OBSERVED: ${describeVerdict(actual)}` +
                        table
                );
            }
            if (actual.stage !== expected.stage) {
                throw new Error(
                    `${where}: ${adapter.name} refused at the WRONG LAYER — expected ` +
                        `${expected.stage}, got ${actual.stage}. Which layer refuses a shape is ` +
                        'the whole subject of the children-port rules: a component that does not ' +
                        'compile and one that compiles and throws are different programs.\n' +
                        `  MESSAGE: ${actual.message}` +
                        table
                );
            }
            if (expected.matching !== undefined && !expected.matching.test(actual.message)) {
                throw new Error(
                    `${where}: ${adapter.name} refused at the right layer with the wrong words — ` +
                        `expected /${expected.matching.source}/.\n  MESSAGE: ${actual.message}` +
                        table
                );
            }
            continue;
        }

        if (actual.outcome !== EXO_OUTCOME_RENDERED) {
            throw new Error(
                `${where}: ${adapter.name} was expected to render and did not.\n` +
                    `  OBSERVED: ${describeVerdict(actual)}` +
                    table
            );
        }
    }

    // 3. THE PARTITION, over the backends that RENDERED and are not UNDECLARED — an unrecorded
    // backend is left out so the other three stay asserted while the fourth is still open.
    const observed = describeExoPartition(exoConformancePartition(verdicts, new Set(unrecorded)));
    const stated = describeExoPartition(rule.agreement);
    if (observed !== stated) {
        throw new Error(
            `${where}: the backends do not divide the way this rule says they do.\n` +
                `  RULE SAYS: ${stated}\n` +
                `  RUN SAYS:  ${observed}\n` +
                '  If the classes MERGED, somebody settled this and the rule is the record ' +
                'of the old answer — change it on purpose. If they SPLIT, a backend moved.' +
                table
        );
    }

    // 4. UNDECLARED, last, so a rule with one unknown backend still reports the rest.
    if (undeclared.length > 0) {
        throw new Error(
            `${where}: this rule has ${undeclared.length} backend(s) whose answer has never been ` +
                'recorded.\n' +
                undeclared.join('\n') +
                '\n  This is not a defect parked behind a green test and it is not a snapshot: ' +
                'it is a fact nobody has established. The verdict above is what the run produced ' +
                '— read it, decide whether it is what the backend SHOULD do, and write it into ' +
                'the rule as `renders()`, `refusesAt(…)` or a divergence class.' +
                table
        );
    }
}
