import type { TExoDiagnostic } from './TExoDiagnostic.js';
import type { TExoMetric } from './TExoMetric.js';
import type { TExoSuggestion } from './TExoSuggestion.js';

export interface TExoAnalysisResult {
    diagnostics: TExoDiagnostic[];
    suggestions: TExoSuggestion[];
    metrics: TExoMetric[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
        suggestions: number;
    };
    analysis?: {
        filesAnalyzed: number;
        summary: {
            errors: number;
            warnings: number;
            info?: number;
        };
        suggestions: TExoSuggestion[];
    };
}
