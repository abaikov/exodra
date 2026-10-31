import { EXO_CAP_ELEMENT } from './constants/EXO_CAP_ELEMENT';
import { EXO_CAP_LIVE_TREE } from './constants/EXO_CAP_LIVE_TREE';
import { EXO_CAP_TEXT_NODE } from './constants/EXO_CAP_TEXT_NODE';
import { EXO_CAP_UPDATE } from './constants/EXO_CAP_UPDATE';
import { EXO_CONFORMANCE_CAPABILITIES } from './constants/EXO_CONFORMANCE_CAPABILITIES';
import { EXO_OUTCOME_CANNOT_EXPRESS } from './constants/EXO_OUTCOME_CANNOT_EXPRESS';
import { EXO_OUTCOME_REFUSED } from './constants/EXO_OUTCOME_REFUSED';
import { EXO_OUTCOME_RENDERED } from './constants/EXO_OUTCOME_RENDERED';
import { EXO_STAGE_SCHEMA_COMPILE } from './constants/EXO_STAGE_SCHEMA_COMPILE';
import { EXO_STAGE_UPDATE } from './constants/EXO_STAGE_UPDATE';
import { EXO_STAGE_WIRE } from './constants/EXO_STAGE_WIRE';
import { exoEntersForeignContent } from './exoEntersForeignContent';
import { exoConformanceTrees } from './exoConformanceTrees';
import type { TExoConformanceAdapter, TExoConformanceRun } from './types/TExoConformanceAdapter';
import type { TExoConformanceRule } from './types/TExoConformanceRule';
import type { TExoConformanceVerdict } from './types/TExoConformanceVerdict';

// ASSERTS NOTHING: judging is `assertExoConformanceRule`. Every phase is caught, because the rules
// worth having are the ones where some backends refuse and others do not. The subject is rebuilt
// per backend inside the loop: a subject owns SOURCES, so four renders sharing one cell would each
// read a value an earlier backend's wiring had already moved.
export function runExoConformanceRule(
    rule: TExoConformanceRule
): ReadonlyMap<string, TExoConformanceVerdict> {
    const verdicts = new Map<string, TExoConformanceVerdict>();
    for (const adapter of exoConformanceTrees) {
        verdicts.set(adapter.name, runOne(rule, adapter));
    }
    return verdicts;
}

// A RULE CANNOT NAME A CAPABILITY IT NEEDS. CANNOT-EXPRESS is the one outcome that lets a backend
// out of a rule without answering it, so it is reachable only from a lever the runner will pull:
// `update`, `fire`, `translate`, a `probe`. One derivation is a property of the artefact instead —
// `<svg>` and `<math>` are the only doors into foreign content, the only place an HTML page has a
// namespace — and it UNDER-reaches, which errs towards asking a backend rather than excusing it.
function capabilitiesNeeded(rule: TExoConformanceRule): readonly string[] {
    const needed = new Set<string>();
    if (rule.probe !== undefined && rule.probe.length > 0) needed.add(EXO_CAP_ELEMENT);
    const shape = rule.subject();
    if (exoEntersForeignContent(shape.component.declaration)) needed.add(EXO_CAP_ELEMENT);
    if (shape.update !== undefined) needed.add(EXO_CAP_UPDATE);
    if (shape.fire !== undefined) needed.add(EXO_CAP_LIVE_TREE);
    if (shape.translate === true) needed.add(EXO_CAP_TEXT_NODE);
    // Canonical order, so a verdict listing two absences prints them the same way every run.
    return EXO_CONFORMANCE_CAPABILITIES.filter((capability) => needed.has(capability));
}

function runOne(
    rule: TExoConformanceRule,
    adapter: TExoConformanceAdapter
): TExoConformanceVerdict {
    // From the ADAPTER's declaration, never the rule's expectation, which is a claim the checker
    // holds against this — sourcing it from the claim would have the claim check itself. EVERY
    // missing capability, not the first, or the recorded reason follows iteration order.
    const missing = capabilitiesNeeded(rule).filter((cap) => !adapter.can.has(cap));
    if (missing.length > 0) {
        return { outcome: EXO_OUTCOME_CANNOT_EXPRESS, capabilities: missing };
    }

    const subject = rule.subject();
    const probe = rule.probe ?? [];

    try {
        adapter.compile(subject.component);
    } catch (error) {
        return {
            outcome: EXO_OUTCOME_REFUSED,
            stage: EXO_STAGE_SCHEMA_COMPILE,
            message: reason(error),
        };
    }

    let run: TExoConformanceRun;
    try {
        run = adapter.render(subject.component, subject.instances ?? 1);
    } catch (error) {
        return { outcome: EXO_OUTCOME_REFUSED, stage: EXO_STAGE_WIRE, message: reason(error) };
    }

    const mounted = run;
    try {
        try {
            // The page's order: extension on load, data after, click last. Writing the text and
            // THEN replacing the node leaves every backend holding a correct-looking tree.
            if (subject.translate === true) mounted.translate();
            if (subject.update !== undefined) subject.update();
            if (subject.fire !== undefined) mounted.fire(subject.fire);
        } catch (error) {
            return {
                outcome: EXO_OUTCOME_REFUSED,
                stage: EXO_STAGE_UPDATE,
                message: reason(error),
            };
        }
        return { outcome: EXO_OUTCOME_RENDERED, sketch: mounted.sketch(probe) };
    } finally {
        // A backend that threw on its update is still torn down, so no rule leaks a subscription.
        try {
            mounted.dispose();
        } catch {
            // A disposer that throws is a finding about the backend, not this rule's verdict.
        }
    }
}

function reason(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// Every verdict, right ones included: a divergence is only readable next to what it diverges from.
export function describeExoConformanceRun(
    verdicts: ReadonlyMap<string, TExoConformanceVerdict>
): string {
    const lines: string[] = [];
    for (const adapter of exoConformanceTrees) {
        const verdict = verdicts.get(adapter.name);
        if (verdict === undefined) continue;
        lines.push('  ' + adapter.name.padEnd(8) + describeVerdict(verdict));
    }
    return lines.join('\n');
}

export function describeVerdict(verdict: TExoConformanceVerdict): string {
    if (verdict.outcome === EXO_OUTCOME_CANNOT_EXPRESS) {
        return 'CANNOT-EXPRESS (no ' + verdict.capabilities.join(', no ') + ')';
    }
    if (verdict.outcome === EXO_OUTCOME_REFUSED) {
        return 'REFUSED at ' + verdict.stage + ' — ' + verdict.message.replace(/\s+/g, ' ');
    }
    return 'RENDERED\n' + verdict.sketch.replace(/^/gm, '           | ');
}
