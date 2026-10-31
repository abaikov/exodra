import { EXO_OUTCOME_CANNOT_EXPRESS } from './constants/EXO_OUTCOME_CANNOT_EXPRESS';
import { EXO_OUTCOME_REFUSED } from './constants/EXO_OUTCOME_REFUSED';
import { EXO_OUTCOME_RENDERED } from './constants/EXO_OUTCOME_RENDERED';
import type { TExoConformanceVerdict } from './types/TExoConformanceVerdict';

// Two backends AGREE when this gives them the same string, so everything the suite calls "the same
// behaviour" is decided here and nowhere else.
//
// A REFUSED verdict is its STAGE and not its words: four sentences for one shape are one behaviour
// to the author, and comparing sentences reports a four-way divergence and breaks on every improved
// message. The LAYER is compared: "compiles here, throws there" is a different program.
//
// A CANNOT-EXPRESS verdict has NO class and is excluded rather than grouped with other absences:
// two backends unable to express a rule have not agreed about anything.
export function exoConformanceClassOf(verdict: TExoConformanceVerdict): string | null {
    if (verdict.outcome === EXO_OUTCOME_CANNOT_EXPRESS) return null;
    if (verdict.outcome === EXO_OUTCOME_REFUSED) return 'REFUSED@' + verdict.stage;
    return 'RENDERED\n' + verdict.sketch;
}

// The backends THAT RENDERED, grouped by artefact. Refusals are left out although they have a
// class: `expect` already holds each to an outcome AND a layer, which says more than group
// membership. `skip` drops unrecorded backends, so one `UNDECLARED` does not cost the rest.
//
// Canonical: names sorted inside each group, groups by their first name — otherwise a partition
// depends on the registry's order and a rule's declaration has to guess it.
export function exoConformancePartition(
    verdicts: ReadonlyMap<string, TExoConformanceVerdict>,
    skip: ReadonlySet<string> = new Set()
): readonly (readonly string[])[] {
    const byClass = new Map<string, string[]>();
    for (const [name, verdict] of verdicts) {
        if (skip.has(name)) continue;
        if (verdict.outcome !== EXO_OUTCOME_RENDERED) continue;
        const key = exoConformanceClassOf(verdict);
        if (key === null) continue;
        const group = byClass.get(key);
        if (group === undefined) byClass.set(key, [name]);
        else group.push(name);
    }
    return canonicalExoPartition(Array.from(byClass.values()));
}

export function canonicalExoPartition(
    partition: readonly (readonly string[])[]
): readonly (readonly string[])[] {
    return partition
        .map((group) => Array.from(group).sort())
        .filter((group) => group.length > 0)
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function describeExoPartition(partition: readonly (readonly string[])[]): string {
    return canonicalExoPartition(partition)
        .map((group) => group.join('+'))
        .join(' | ');
}
