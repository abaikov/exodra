/**
 * Schema introspection and analysis
 */

// import type { Schema } from '@exodra/core';
import type { AnalysisResult, Diagnostic, Suggestion, Metric } from './types.js';

export interface SchemaAnalysis extends AnalysisResult {
  schemas: SchemaInfo[];
  relationships: SchemaRelationship[];
  coverage: SchemaCoverage;
}

export interface SchemaInfo {
  name: string;
  type: string;
  location: string;
  properties: PropertyInfo[];
  validation: ValidationInfo;
  usage: UsageInfo;
}

export interface PropertyInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string | number | boolean | null;
  validation?: string[];
}

export interface ValidationInfo {
  hasValidation: boolean;
  validationRules: string[];
  customValidators: string[];
}

export interface UsageInfo {
  usedIn: string[];
  frequency: number;
  lastUsed?: string;
}

export interface SchemaRelationship {
  from: string;
  to: string;
  type: 'extends' | 'references' | 'composes';
  location: string;
}

export interface SchemaCoverage {
  totalSchemas: number;
  validatedSchemas: number;
  testedSchemas: number;
  documentedSchemas: number;
  coveragePercentage: number;
}

export class SchemaAnalyzer {
  private schemas: Map<string, SchemaInfo> = new Map();
  private relationships: SchemaRelationship[] = [];
  
  /**
   * Analyze all schemas in the project
   */
  async analyzeProject(projectRoot: string): Promise<SchemaAnalysis> {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    const metrics: Metric[] = [];
    
    // Discover and analyze schemas
    await this.discoverSchemas(projectRoot);
    
    // Validate schema definitions
    for (const [, schema] of this.schemas.entries()) {
      const schemaAnalysis = this.analyzeSchema(schema);
      diagnostics.push(...schemaAnalysis.diagnostics);
      suggestions.push(...schemaAnalysis.suggestions);
      metrics.push(...schemaAnalysis.metrics);
    }
    
    // Analyze relationships
    this.analyzeRelationships();
    
    // Calculate coverage
    const coverage = this.calculateCoverage();
    
    // Add coverage metrics
    metrics.push({
      name: 'schema_coverage',
      value: coverage.coveragePercentage,
      unit: 'percentage',
      category: 'quality',
      threshold: { warning: 70, error: 50 }
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
      schemas: Array.from(this.schemas.values()),
      relationships: this.relationships,
      coverage
    };
  }
  
  /**
   * Analyze a specific schema
   */
  private analyzeSchema(schemaInfo: SchemaInfo): AnalysisResult {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    const metrics: Metric[] = [];
    
    // Check for missing validation
    if (!schemaInfo.validation.hasValidation) {
      suggestions.push({
        id: 'missing-validation',
        title: 'Add schema validation',
        description: `Schema '${schemaInfo.name}' lacks runtime validation`,
        category: 'validation',
        impact: 'high',
        effort: 'low'
      });
    }
    
    // Check for unused schemas
    if (schemaInfo.usage.frequency === 0) {
      diagnostics.push({
        id: 'unused-schema',
        severity: 'warning',
        message: `Schema '${schemaInfo.name}' is defined but never used`,
        location: { file: schemaInfo.location, line: 1, column: 1 },
        category: 'unused-code'
      });
    }
    
    // Check for complex schemas that need documentation
    if (schemaInfo.properties.length > 10 && !this.hasDocumentation(schemaInfo)) {
      suggestions.push({
        id: 'add-documentation',
        title: 'Add schema documentation',
        description: `Large schema '${schemaInfo.name}' should have documentation`,
        category: 'documentation',
        impact: 'medium',
        effort: 'medium'
      });
    }
    
    // Check for deeply nested schemas
    const nestingLevel = this.calculateNestingLevel(schemaInfo);
    if (nestingLevel > 3) {
      suggestions.push({
        id: 'reduce-nesting',
        title: 'Consider flattening schema',
        description: `Schema '${schemaInfo.name}' has deep nesting (${nestingLevel} levels)`,
        category: 'design',
        impact: 'medium',
        effort: 'high'
      });
    }
    
    // Add schema metrics
    metrics.push(
      {
        name: 'schema_properties',
        value: schemaInfo.properties.length,
        unit: 'count',
        category: 'complexity'
      },
      {
        name: 'schema_nesting',
        value: nestingLevel,
        unit: 'levels',
        category: 'complexity'
      },
      {
        name: 'schema_usage',
        value: schemaInfo.usage.frequency,
        unit: 'count',
        category: 'usage'
      }
    );
    
    return {
      diagnostics,
      suggestions,
      metrics,
      summary: {
        errors: diagnostics.filter(d => d.severity === 'error').length,
        warnings: diagnostics.filter(d => d.severity === 'warning').length,
        info: diagnostics.filter(d => d.severity === 'info').length,
        suggestions: suggestions.length
      }
    };
  }
  
  /**
   * Discover schemas in the project
   */
  private async discoverSchemas(_projectRoot: string): Promise<void> {
    // This would use the static analysis engine to find schema definitions
    // For now, we'll simulate discovery
    
    // Example discovered schemas
    this.schemas.set('UserSchema', {
      name: 'UserSchema',
      type: 'object',
      location: 'src/schemas/user.ts',
      properties: [
        { name: 'id', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
        { name: 'age', type: 'number', required: false }
      ],
      validation: {
        hasValidation: true,
        validationRules: ['email', 'min-length'],
        customValidators: []
      },
      usage: {
        usedIn: ['components/UserProfile.tsx', 'api/users.ts'],
        frequency: 15,
        lastUsed: new Date().toISOString()
      }
    });
  }
  
  /**
   * Analyze schema relationships
   */
  private analyzeRelationships(): void {
    // Analyze extends, references, and composition relationships
    // This would parse the AST to find inheritance and references
  }
  
  /**
   * Calculate schema coverage metrics
   */
  private calculateCoverage(): SchemaCoverage {
    const totalSchemas = this.schemas.size;
    const validatedSchemas = Array.from(this.schemas.values())
      .filter(s => s.validation.hasValidation).length;
    const testedSchemas = Array.from(this.schemas.values())
      .filter(s => this.hasTests(s)).length;
    const documentedSchemas = Array.from(this.schemas.values())
      .filter(s => this.hasDocumentation(s)).length;
    
    const coveragePercentage = totalSchemas > 0 
      ? Math.round(((validatedSchemas + testedSchemas + documentedSchemas) / (totalSchemas * 3)) * 100)
      : 0;
    
    return {
      totalSchemas,
      validatedSchemas,
      testedSchemas,
      documentedSchemas,
      coveragePercentage
    };
  }
  
  /**
   * Check if schema has tests
   */
  private hasTests(schema: SchemaInfo): boolean {
    // This would check for test files that reference the schema
    return schema.name.includes('User'); // Simplified for demo
  }
  
  /**
   * Check if schema has documentation
   */
  private hasDocumentation(schema: SchemaInfo): boolean {
    // This would check for JSDoc comments or external documentation
    return schema.properties.length <= 5; // Simplified for demo
  }
  
  /**
   * Calculate schema nesting level
   */
  private calculateNestingLevel(schema: SchemaInfo): number {
    // This would analyze the schema structure for nested objects
    const nestedProperties = schema.properties.filter(p => 
      p.type.includes('object') || p.type.includes('array')
    );
    return nestedProperties.length > 0 ? 2 : 1; // Simplified for demo
  }
  
  /**
   * Generate schema optimization suggestions
   */
  generateOptimizationSuggestions(schemas: SchemaInfo[]): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Find duplicate property patterns
    const propertyPatterns = new Map<string, string[]>();
    schemas.forEach(schema => {
      schema.properties.forEach(prop => {
        const pattern = `${prop.name}:${prop.type}`;
        if (!propertyPatterns.has(pattern)) {
          propertyPatterns.set(pattern, []);
        }
        propertyPatterns.get(pattern)!.push(schema.name);
      });
    });
    
    // Suggest base schemas for common patterns
    propertyPatterns.forEach((schemaNames, pattern) => {
      if (schemaNames.length >= 3) {
        suggestions.push({
          id: 'extract-base-schema',
          title: 'Extract common base schema',
          description: `Property pattern '${pattern}' is repeated in ${schemaNames.length} schemas`,
          category: 'refactoring',
          impact: 'medium',
          effort: 'medium'
        });
      }
    });
    
    return suggestions;
  }
  
  /**
   * Validate schema against best practices
   */
  validateBestPractices(schema: SchemaInfo): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    
    // Check naming conventions
    if (!schema.name.endsWith('Schema') && !schema.name.endsWith('Type')) {
      diagnostics.push({
        id: 'schema-naming',
        severity: 'warning',
        message: `Schema '${schema.name}' should follow naming convention (end with 'Schema' or 'Type')`,
        location: { file: schema.location, line: 1, column: 1 },
        category: 'conventions'
      });
    }
    
    // Check for required properties
    const requiredProps = schema.properties.filter(p => p.required);
    if (requiredProps.length === 0) {
      diagnostics.push({
        id: 'no-required-props',
        severity: 'info',
        message: `Schema '${schema.name}' has no required properties`,
        location: { file: schema.location, line: 1, column: 1 },
        category: 'design'
      });
    }
    
    return diagnostics;
  }
}