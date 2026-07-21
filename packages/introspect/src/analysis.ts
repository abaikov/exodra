/**
 * General code analysis utilities
 */

import type { AnalysisResult, Diagnostic, Suggestion, Metric, SourceLocation } from './types.js';

export interface CodeAnalysis extends AnalysisResult {
  quality: CodeQuality;
  patterns: CodePattern[];
  security: SecurityAnalysis;
  maintainability: MaintainabilityReport;
}

export interface CodeQuality {
  score: number; // 0-100
  factors: QualityFactor[];
  trends: QualityTrend[];
  recommendations: string[];
}

export interface QualityFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  description: string;
  metrics: { [key: string]: number };
}

export interface QualityTrend {
  factor: string;
  direction: 'improving' | 'stable' | 'declining';
  change: number; // percentage change
  period: string;
}

export interface CodePattern {
  name: string;
  category: 'design' | 'anti-pattern' | 'best-practice' | 'architectural';
  confidence: number; // 0-1
  occurrences: PatternOccurrence[];
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  suggestions?: string[];
}

export interface PatternOccurrence {
  location: SourceLocation;
  context: string;
  confidence: number;
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  riskScore: number; // 0-100
  compliance: ComplianceCheck[];
  recommendations: SecurityRecommendation[];
}

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: string;
  description: string;
  location: SourceLocation;
  cwe?: string; // Common Weakness Enumeration
  mitigation: string[];
  falsePositive?: boolean;
}

export interface ComplianceCheck {
  standard: string; // e.g., 'OWASP', 'SOC2', 'GDPR'
  status: 'compliant' | 'non-compliant' | 'partial' | 'unknown';
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning' | 'n/a';
    details?: string;
  }[];
}

export interface SecurityRecommendation {
  category: 'authentication' | 'authorization' | 'data-protection' | 'input-validation' | 'crypto' | 'general';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string[];
}

export interface MaintainabilityReport {
  index: number; // 0-100
  factors: {
    complexity: number;
    testability: number;
    readability: number;
    modularity: number;
    documentation: number;
  };
  issues: MaintainabilityIssue[];
  projections: {
    technicalDebt: number; // hours
    refactoringEffort: number; // hours
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface MaintainabilityIssue {
  category: 'complexity' | 'coupling' | 'cohesion' | 'naming' | 'documentation' | 'testing';
  severity: 'major' | 'minor' | 'info';
  description: string;
  location: SourceLocation;
  effort: number; // hours to fix
  impact: string;
}

export class CodeAnalyzer {
  /**
   * Perform comprehensive code analysis
   */
  async analyzeCode(projectRoot: string): Promise<CodeAnalysis> {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    const metrics: Metric[] = [];
    
    // Analyze code quality
    const quality = await this.analyzeQuality(projectRoot);
    
    // Detect patterns
    const patterns = await this.detectPatterns(projectRoot);
    
    // Security analysis
    const security = await this.analyzeSecurityusin(projectRoot);
    
    // Maintainability analysis
    const maintainability = await this.analyzeMaintainability(projectRoot);
    
    // Convert findings to diagnostics and suggestions
    security.vulnerabilities.forEach(vuln => {
      diagnostics.push({
        id: vuln.id,
        severity: vuln.severity === 'critical' || vuln.severity === 'high' ? 'error' : 'warning',
        message: vuln.description,
        location: vuln.location,
        category: 'security',
        tags: ['security', vuln.type]
      });
    });
    
    maintainability.issues.forEach(issue => {
      const suggestion: Suggestion = {
        id: `maintainability-${issue.category}`,
        title: `Improve ${issue.category}`,
        description: issue.description,
        location: issue.location,
        category: 'maintainability',
        impact: issue.severity === 'major' ? 'high' : 'medium',
        effort: issue.effort < 2 ? 'low' : issue.effort < 8 ? 'medium' : 'high'
      };
      
      suggestions.push(suggestion);
    });
    
    // Add quality-based diagnostics
    quality.factors.forEach(factor => {
      if (factor.score < 60) {
        diagnostics.push({
          id: `quality-${factor.name}`,
          severity: factor.score < 40 ? 'error' : 'warning',
          message: `${factor.name} quality is below threshold (${factor.score}/100)`,
          location: { file: projectRoot, line: 1, column: 1 },
          category: 'quality'
        });
      }
    });
    
    return {
      diagnostics,
      suggestions,
      metrics,
      summary: {
        errors: diagnostics.filter(d => d.severity === 'error').length,
        warnings: diagnostics.filter(d => d.severity === 'warning').length,
        info: diagnostics.filter(d => d.severity === 'info').length,
        suggestions: suggestions.length
      },
      quality,
      patterns,
      security,
      maintainability
    };
  }
  
  /**
   * Analyze code quality metrics
   */
  private async analyzeQuality(_projectRoot: string): Promise<CodeQuality> {
    // Mock quality analysis - would use real metrics
    const factors: QualityFactor[] = [
      {
        name: 'Type Safety',
        score: 92,
        weight: 0.25,
        description: 'TypeScript usage and type coverage',
        metrics: {
          typeCoverage: 92,
          anyTypes: 3,
          strictMode: 100
        }
      },
      {
        name: 'Code Complexity',
        score: 78,
        weight: 0.2,
        description: 'Cyclomatic and cognitive complexity',
        metrics: {
          avgComplexity: 6.2,
          maxComplexity: 15,
          complexFunctions: 8
        }
      },
      {
        name: 'Test Coverage',
        score: 85,
        weight: 0.2,
        description: 'Unit and integration test coverage',
        metrics: {
          lineCoverage: 85,
          branchCoverage: 80,
          functionCoverage: 90
        }
      },
      {
        name: 'Documentation',
        score: 70,
        weight: 0.15,
        description: 'Code comments and API documentation',
        metrics: {
          jsdocCoverage: 60,
          readmeQuality: 80,
          apiDocs: 70
        }
      },
      {
        name: 'Consistency',
        score: 88,
        weight: 0.2,
        description: 'Coding standards and style consistency',
        metrics: {
          eslintScore: 95,
          namingConsistency: 82,
          structureConsistency: 85
        }
      }
    ];
    
    // Calculate weighted score
    const score = Math.round(
      factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0)
    );
    
    const trends: QualityTrend[] = [
      {
        factor: 'Type Safety',
        direction: 'improving',
        change: 5.2,
        period: 'last 30 days'
      },
      {
        factor: 'Test Coverage',
        direction: 'stable',
        change: 0.8,
        period: 'last 30 days'
      }
    ];
    
    const recommendations = [
      'Increase test coverage for components with complex logic',
      'Add JSDoc comments to public APIs',
      'Reduce complexity in high-complexity functions',
      'Implement stricter TypeScript configuration'
    ];
    
    return {
      score,
      factors,
      trends,
      recommendations
    };
  }
  
  /**
   * Detect code patterns and anti-patterns
   */
  private async detectPatterns(_projectRoot: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    
    // Mock pattern detection
    patterns.push(
      {
        name: 'Repository Pattern',
        category: 'design',
        confidence: 0.85,
        occurrences: [
          {
            location: { file: 'src/repositories/UserRepository.ts', line: 15, column: 1 },
            context: 'class UserRepository implements IUserRepository',
            confidence: 0.9
          }
        ],
        description: 'Data access abstraction pattern',
        impact: 'positive',
        suggestions: [
          'Consider adding caching layer',
          'Implement error handling strategies'
        ]
      },
      {
        name: 'God Object',
        category: 'anti-pattern',
        confidence: 0.75,
        occurrences: [
          {
            location: { file: 'src/services/AppService.ts', line: 1, column: 1 },
            context: 'class AppService with 25 methods',
            confidence: 0.8
          }
        ],
        description: 'Class with too many responsibilities',
        impact: 'negative',
        suggestions: [
          'Split into smaller, focused services',
          'Apply Single Responsibility Principle',
          'Extract related functionality into separate classes'
        ]
      },
      {
        name: 'Observer Pattern',
        category: 'design',
        confidence: 0.9,
        occurrences: [
          {
            location: { file: 'src/signals/eventEmitter.ts', line: 20, column: 5 },
            context: 'Event subscription and notification system',
            confidence: 0.95
          }
        ],
        description: 'Reactive event handling pattern',
        impact: 'positive'
      },
      {
        name: 'Callback Hell',
        category: 'anti-pattern',
        confidence: 0.65,
        occurrences: [
          {
            location: { file: 'src/utils/asyncHelper.ts', line: 45, column: 8 },
            context: 'Nested callbacks 4 levels deep',
            confidence: 0.7
          }
        ],
        description: 'Deeply nested asynchronous callbacks',
        impact: 'negative',
        suggestions: [
          'Convert to async/await pattern',
          'Use Promise chains',
          'Extract callback functions'
        ]
      }
    );
    
    return patterns;
  }
  
  /**
   * Analyze security vulnerabilities and compliance
   */
  private async analyzeSecurityusin(_projectRoot: string): Promise<SecurityAnalysis> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Mock security analysis
    vulnerabilities.push(
      {
        id: 'xss-risk-001',
        severity: 'medium',
        type: 'Cross-Site Scripting (XSS)',
        description: 'Potentially unsafe HTML rendering without sanitization',
        location: { file: 'src/components/UserContent.tsx', line: 25, column: 12 },
        cwe: 'CWE-79',
        mitigation: [
          'Sanitize user input before rendering',
          'Use dangerouslySetInnerHTML sparingly',
          'Implement Content Security Policy'
        ]
      },
      {
        id: 'auth-weak-001',
        severity: 'high',
        type: 'Weak Authentication',
        description: 'No password complexity requirements enforced',
        location: { file: 'src/auth/validation.ts', line: 10, column: 5 },
        cwe: 'CWE-521',
        mitigation: [
          'Implement password complexity rules',
          'Add password strength meter',
          'Require minimum password length'
        ]
      },
      {
        id: 'data-exposure-001',
        severity: 'low',
        type: 'Information Disclosure',
        description: 'Debug information exposed in production build',
        location: { file: 'src/utils/logger.ts', line: 8, column: 15 },
        cwe: 'CWE-200',
        mitigation: [
          'Remove debug logs in production',
          'Use environment-specific logging',
          'Implement log sanitization'
        ]
      }
    );
    
    // Calculate risk score
    const riskScore = vulnerabilities.reduce((score, vuln) => {
      const severityScore = {
        critical: 25,
        high: 15,
        medium: 8,
        low: 3,
        info: 1
      };
      return score + severityScore[vuln.severity];
    }, 0);
    
    const compliance: ComplianceCheck[] = [
      {
        standard: 'OWASP Top 10',
        status: 'partial',
        checks: [
          { name: 'A01: Broken Access Control', status: 'pass' },
          { name: 'A02: Cryptographic Failures', status: 'warning', details: 'Weak password requirements' },
          { name: 'A03: Injection', status: 'pass' },
          { name: 'A07: Cross-Site Scripting', status: 'warning', details: 'Potential XSS vulnerabilities' }
        ]
      }
    ];
    
    const recommendations: SecurityRecommendation[] = [
      {
        category: 'authentication',
        priority: 'high',
        title: 'Strengthen Password Policy',
        description: 'Implement comprehensive password requirements',
        implementation: [
          'Add minimum length requirement (12+ characters)',
          'Require mix of uppercase, lowercase, numbers, symbols',
          'Implement password history to prevent reuse',
          'Add account lockout after failed attempts'
        ]
      },
      {
        category: 'input-validation',
        priority: 'medium',
        title: 'Input Sanitization',
        description: 'Sanitize all user inputs to prevent XSS attacks',
        implementation: [
          'Use DOMPurify for HTML sanitization',
          'Validate and escape all user inputs',
          'Implement Content Security Policy headers',
          'Use parameterized queries for database access'
        ]
      }
    ];
    
    return {
      vulnerabilities,
      riskScore,
      compliance,
      recommendations
    };
  }
  
  /**
   * Analyze code maintainability
   */
  private async analyzeMaintainability(_projectRoot: string): Promise<MaintainabilityReport> {
    const factors = {
      complexity: 78,      // Lower complexity = higher maintainability
      testability: 85,     // Good test coverage and structure
      readability: 82,     // Clear naming and structure
      modularity: 88,      // Well-separated concerns
      documentation: 70    // Adequate but could be improved
    };
    
    // Calculate maintainability index (0-100)
    const index = Math.round(
      (factors.complexity * 0.25) +
      (factors.testability * 0.2) +
      (factors.readability * 0.2) +
      (factors.modularity * 0.2) +
      (factors.documentation * 0.15)
    );
    
    const issues: MaintainabilityIssue[] = [
      {
        category: 'complexity',
        severity: 'major',
        description: 'Function has high cyclomatic complexity (15)',
        location: { file: 'src/utils/dataProcessor.ts', line: 45, column: 1 },
        effort: 4,
        impact: 'Difficult to test and modify'
      },
      {
        category: 'coupling',
        severity: 'minor',
        description: 'High coupling between modules',
        location: { file: 'src/services/UserService.ts', line: 1, column: 1 },
        effort: 6,
        impact: 'Changes require modifications in multiple files'
      },
      {
        category: 'documentation',
        severity: 'minor',
        description: 'Missing JSDoc comments for public API',
        location: { file: 'src/api/endpoints.ts', line: 20, column: 1 },
        effort: 2,
        impact: 'Difficult for new developers to understand API'
      }
    ];
    
    // Calculate technical debt
    const technicalDebt = issues.reduce((total, issue) => total + issue.effort, 0);
    const refactoringEffort = technicalDebt * 1.5; // Include planning and testing time
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (index >= 80) riskLevel = 'low';
    else if (index >= 60) riskLevel = 'medium';
    else if (index >= 40) riskLevel = 'high';
    else riskLevel = 'critical';
    
    return {
      index,
      factors,
      issues,
      projections: {
        technicalDebt,
        refactoringEffort,
        riskLevel
      }
    };
  }
}