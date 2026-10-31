import type { TExoCodeAction } from './TExoCodeAction.js';
import type { TExoSourceLocation } from './TExoSourceLocation.js';

export interface TExoSuggestion {
    id: string;
    title: string;
    description: string;
    location?: TExoSourceLocation;
    category: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    autoFixable?: boolean;
    codeActions?: TExoCodeAction[];
}
