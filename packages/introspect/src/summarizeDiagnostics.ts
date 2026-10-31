import type { TExoDiagnostic } from './types/TExoDiagnostic.js';
import type { TExoSuggestion } from './types/TExoSuggestion.js';

/**
 * THE COUNTS EVERY ANALYSER ENDS WITH — written once, because it was written eleven times.
 *
 * Every analyser in this package returns the same tail: how many diagnostics were errors,
 * how many were warnings, how many were info, and how many suggestions came with them. All
 * eleven copies agreed, which is the only reason nobody noticed them; a twelfth analyser
 * that spelled one of the severities differently would have been a silent zero in a report.
 *
 * One pass instead of three filters, since the counts are wanted together.
 */
export function summarizeDiagnostics(
    diagnostics: readonly TExoDiagnostic[],
    suggestions: readonly TExoSuggestion[]
): { errors: number; warnings: number; info: number; suggestions: number } {
    let errors = 0;
    let warnings = 0;
    let info = 0;

    for (const diagnostic of diagnostics) {
        if (diagnostic.severity === 'error') errors++;
        else if (diagnostic.severity === 'warning') warnings++;
        else if (diagnostic.severity === 'info') info++;
    }

    return { errors, warnings, info, suggestions: suggestions.length };
}
