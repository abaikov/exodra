import type { TExoDiagnosticSeverity } from './TExoDiagnosticSeverity.js';
import type { TExoSourceLocation } from './TExoSourceLocation.js';

export interface TExoDiagnostic {
    id: string;
    severity: TExoDiagnosticSeverity;
    message: string;
    location: TExoSourceLocation;
    category: string;
    tags?: string[];
    fixable?: boolean;
}
