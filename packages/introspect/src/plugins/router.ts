/**
 * Built-in router plugin that understands @exodra/router guard system
 */

import type { 
  ExoIntrospectPlugin, 
  ExoAnalysisContext,
  ExoComponentInfo 
} from '../plugins.js';
import type {
  ExoDiagnostic,
  ExoSuggestion,
  ExoMetric,
  ExoSourceLocation
} from '../types.js';

export interface ExoRouterGuardInfo {
  name: string;
  type: 'beforeEnter' | 'beforeLeave' | 'beforeEach' | 'afterEach';
  async: boolean;
  location: ExoSourceLocation;
  dependencies: string[];
  complexity: 'low' | 'medium' | 'high';
  routes: string[];
}

export interface ExoRouterConfigInfo {
  routes: ExoRouteConfigInfo[];
  guards: ExoRouterGuardInfo[];
  patterns: ExoRouterPatternInfo[];
  security: ExoRouterSecurityInfo;
}

export interface ExoRouteConfigInfo {
  path: string;
  component: string;
  guards: string[];
  lazy: boolean;
  nested: boolean;
  params: string[];
  location: ExoSourceLocation;
}

export interface ExoRouterPatternInfo {
  name: string;
  description: string;
  occurrences: number;
  examples: ExoSourceLocation[];
  recommendations: string[];
}

export interface ExoRouterSecurityInfo {
  protectedRoutes: number;
  publicRoutes: number;
  guardCoverage: number; // percentage
  vulnerabilities: ExoRouterVulnerability[];
}

export interface ExoRouterVulnerability {
  type: 'missing-auth' | 'weak-guard' | 'exposed-admin' | 'circular-redirect';
  route: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  fix: string;
}

/**
 * Router plugin that analyzes @exodra/router configurations
 */
export const exoRouterPlugin: ExoIntrospectPlugin = {
  name: '@exodra/introspect-router',
  version: '1.0.0',
  description: 'Built-in router analysis for @exodra/router',
  author: 'Exodra Team',
  
  library: {
    name: '@exodra/router',
    version: '1.0.0',
    packageName: '@exodra/router'
  },
  
  capabilities: [
    'component-analysis',
    'pattern-detection', 
    'validation',
    'ai-context'
  ],
  
  hooks: {
    analyzeComponent: async (component, _context) => {
      const diagnostics: ExoDiagnostic[] = [];
      const suggestions: ExoSuggestion[] = [];
      const metrics: ExoMetric[] = [];
      const patterns: string[] = [];
      
      // Check if this is a router configuration
      const isRouterConfig = isRouterConfigComponent(component);
      const isRouteComponentCheck = isRouteComponent(component);
      const isGuardComponentCheck = isGuardComponent(component);
      
      if (isRouterConfig) {
        const routerAnalysis = analyzeRouterConfig(component);
        diagnostics.push(...routerAnalysis.diagnostics);
        suggestions.push(...routerAnalysis.suggestions);
        metrics.push(...routerAnalysis.metrics);
        patterns.push('router-configuration');
      }
      
      if (isRouteComponentCheck) {
        const routeAnalysis = analyzeRouteComponent(component);
        diagnostics.push(...routeAnalysis.diagnostics);
        suggestions.push(...routeAnalysis.suggestions);
        patterns.push('route-component');
      }
      
      if (isGuardComponentCheck) {
        const guardAnalysis = analyzeGuardComponent(component);
        diagnostics.push(...guardAnalysis.diagnostics);
        suggestions.push(...guardAnalysis.suggestions);
        patterns.push('route-guard');
      }
      
      return { diagnostics, suggestions, metrics, patterns };
    },
    
    generateAIContext: async (context) => {
      const routerInfo = await analyzeProjectRouter(context);
      return generateRouterAIContext(routerInfo);
    },
    
    validatePatterns: async (code, location) => {
      const diagnostics: ExoDiagnostic[] = [];
      
      // Check for common router anti-patterns
      if (code.includes('createRouter') && !code.includes('beforeEach')) {
        diagnostics.push({
          id: 'missing-global-guards',
          severity: 'info',
          message: 'Consider adding global guards (beforeEach) for consistent auth checks',
          location,
          category: 'router-patterns'
        });
      }
      
      // Check for hardcoded routes
      if (code.match(/path:\s*['"`]\/[^'"`]+['"`]/g)) {
        const routes = code.match(/path:\s*['"`](\/[^'"`]+)['"`]/g);
        if (routes && routes.length > 10) {
          diagnostics.push({
            id: 'too-many-hardcoded-routes',
            severity: 'warning',
            message: 'Consider using dynamic route generation for large route sets',
            location,
            category: 'maintainability'
          });
        }
      }
      
      return diagnostics;
    }
  },
  
  patterns: [
    {
      id: 'protected-route-pattern',
      name: 'Protected Route Pattern',
      description: 'Routes with authentication guards',
      matcher: (component) => {
        return component.imports.some(imp => imp.includes('@exodra/router')) &&
               (component.name.includes('Protected') || 
                hasBeforeEnterGuard(component));
      },
      analyze: async (component) => {
        const issues: ExoDiagnostic[] = [];
        const optimizations: ExoSuggestion[] = [];
        
        // Check if protected routes have proper error handling
        if (!hasErrorBoundary(component)) {
          optimizations.push({
            id: 'add-error-boundary',
            title: 'Add error boundary for protected routes',
            description: 'Protected routes should have error boundaries to handle auth failures',
            category: 'error-handling',
            impact: 'medium',
            effort: 'low'
          });
        }
        
        return { confidence: 0.9, issues, optimizations };
      },
      bestPractices: [
        {
          title: 'Use consistent guard patterns',
          description: 'Apply similar authentication logic across protected routes',
          example: `
const authGuard = (to, from) => {
  if (!isAuthenticated()) {
    return '/login';
  }
  return true;
};

const routes = [
  { path: '/dashboard', component: Dashboard, beforeEnter: authGuard },
  { path: '/profile', component: Profile, beforeEnter: authGuard }
];`
        }
      ],
      performance: {
        renderComplexity: 'medium',
        memoryFootprint: 'small',
        recommendations: [
          'Cache guard results when possible',
          'Use lazy loading for protected routes',
          'Minimize guard execution time'
        ],
        commonPitfalls: [
          'Expensive operations in guards',
          'Not handling async guard failures',
          'Guard logic duplication'
        ]
      }
    },
    
    {
      id: 'nested-route-pattern',
      name: 'Nested Route Pattern',
      description: 'Layout routes with nested children',
      matcher: (component) => {
        return hasNestedRoutes(component);
      },
      analyze: async (component) => {
        const issues: ExoDiagnostic[] = [];
        const optimizations: ExoSuggestion[] = [];
        
        const nestingLevel = calculateNestingLevel(component);
        if (nestingLevel > 3) {
          issues.push({
            id: 'deep-nesting',
            severity: 'warning',
            message: `Route nesting is ${nestingLevel} levels deep, consider flattening`,
            location: component.location,
            category: 'complexity'
          });
        }
        
        return { confidence: 0.8, issues, optimizations };
      },
      bestPractices: [
        {
          title: 'Keep nesting shallow',
          description: 'Avoid deeply nested route structures for maintainability',
          example: `
// Good: 2-3 levels max
const routes = [
  {
    path: '/app',
    component: AppLayout,
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'settings', component: Settings }
    ]
  }
];`
        }
      ],
      performance: {
        renderComplexity: 'low',
        memoryFootprint: 'small',
        recommendations: [
          'Use outlet components efficiently',
          'Minimize layout re-renders',
          'Share common layout logic'
        ],
        commonPitfalls: [
          'Recreating layouts on each route change',
          'Passing unnecessary props down the tree'
        ]
      }
    }
  ],
  
  rules: [
    {
      id: 'router-guard-async',
      name: 'Async Route Guards',
      description: 'Route guards should handle async operations properly',
      severity: 'warning',
      category: 'async',
      check: async (context) => {
        const diagnostics: ExoDiagnostic[] = [];
        const code = context.code;
        
        // Check for guards that look async but don't return promises
        const asyncGuardPattern = /beforeEnter\s*:\s*async\s+\([^)]*\)\s*=>\s*{[^}]*return\s+(?!.*await)[^;]+;/g;
        const matches = code.match(asyncGuardPattern);
        
        if (matches) {
          diagnostics.push({
            id: 'async-guard-no-await',
            severity: 'warning',
            message: 'Async guard should use await or return Promise',
            location: context.component.location,
            category: 'async'
          });
        }
        
        return diagnostics;
      },
      fix: async (context) => {
        // Simple auto-fix for common async guard issues
        return context.code.replace(
          /(beforeEnter\s*:\s*async\s+\([^)]*\)\s*=>\s*{[^}]*return\s+)([^;]+);/g,
          '$1await $2;'
        );
      }
    },
    
    {
      id: 'router-circular-redirect',
      name: 'Prevent Circular Redirects',
      description: 'Guards should not create circular redirect loops',
      severity: 'error',
      category: 'logic',
      check: async (context) => {
        const diagnostics: ExoDiagnostic[] = [];
        const code = context.code;
        
        // Look for potential circular redirects
        const redirectPatterns = code.match(/return\s+['"`]([^'"`]+)['"`]/g);
        if (redirectPatterns && redirectPatterns.length > 1) {
          // Simplified check - in reality would analyze control flow
          diagnostics.push({
            id: 'potential-circular-redirect',
            severity: 'warning',
            message: 'Check for potential circular redirects in route guards',
            location: context.component.location,
            category: 'logic'
          });
        }
        
        return diagnostics;
      }
    }
  ],
  
  aiContext: [
    {
      name: 'Router Configuration',
      type: 'patterns',
      priority: 10,
      provide: async (context) => {
        const routerInfo = await analyzeProjectRouter(context);
        
        if (!routerInfo.routes.length) return '';
        
        return `
# Router Configuration

## Routes Structure
Found ${routerInfo.routes.length} routes with ${routerInfo.guards.length} guards:

### Public Routes
${routerInfo.routes
  .filter(r => r.guards.length === 0)
  .map(r => `- **${r.path}** → ${r.component}`)
  .join('\n')}

### Protected Routes  
${routerInfo.routes
  .filter(r => r.guards.length > 0)
  .map(r => `- **${r.path}** → ${r.component} (Guards: ${r.guards.join(', ')})`)
  .join('\n')}

### Route Guards
${routerInfo.guards.map(g => `
#### ${g.name} (${g.type})
- **Complexity**: ${g.complexity}
- **Async**: ${g.async ? 'Yes' : 'No'}
- **Used by**: ${g.routes.length} routes
`).join('')}

## Security Analysis
- **Guard Coverage**: ${routerInfo.security.guardCoverage}%
- **Protected Routes**: ${routerInfo.security.protectedRoutes}
- **Public Routes**: ${routerInfo.security.publicRoutes}

${routerInfo.security.vulnerabilities.length > 0 ? `
### Security Issues
${routerInfo.security.vulnerabilities.map(v => `
- **${v.type}**: ${v.description} (${v.severity})
  Fix: ${v.fix}
`).join('')}
` : ''}

## Best Practices for This Router Setup
- Use global guards (\`beforeEach\`) for common auth checks
- Implement loading states for async route operations
- Add error boundaries for protected routes
- Consider lazy loading for large route components
- Group related routes under layout components
`;
      }
    }
  ]
};

// Helper functions
function isRouterConfigComponent(component: ExoComponentInfo): boolean {
  return component.imports.some(imp => imp.includes('@exodra/router')) &&
         (component.name.includes('Router') || 
          component.name.includes('routes') ||
          hasCreateRouterCall(component));
}

function isRouteComponent(component: ExoComponentInfo): boolean {
  return component.name.endsWith('Page') || 
         component.name.endsWith('Route') ||
         component.filePath.includes('/pages/') ||
         component.filePath.includes('/routes/');
}

function isGuardComponent(component: ExoComponentInfo): boolean {
  return component.name.includes('Guard') ||
         component.name.includes('guard') ||
         component.filePath.includes('/guards/');
}

function hasCreateRouterCall(component: ExoComponentInfo): boolean {
  // Would check AST for createRouter calls
  return component.name.includes('createRouter');
}

function hasBeforeEnterGuard(component: ExoComponentInfo): boolean {
  // Would check AST for beforeEnter properties
  return component.props.some(p => p.name === 'beforeEnter');
}

function hasErrorBoundary(component: ExoComponentInfo): boolean {
  // Would check for error boundary components
  return component.imports.some(imp => imp.includes('ErrorBoundary'));
}

function hasNestedRoutes(component: ExoComponentInfo): boolean {
  // Would check AST for children routes
  return component.props.some(p => p.name === 'children');
}

function calculateNestingLevel(_component: ExoComponentInfo): number {
  // Would analyze AST to calculate actual nesting depth
  return 2; // Mock value
}

function analyzeRouterConfig(_component: ExoComponentInfo) {
  const diagnostics: ExoDiagnostic[] = [];
  const suggestions: ExoSuggestion[] = [];
  const metrics: ExoMetric[] = [];
  
  // Mock analysis - would parse actual router config
  metrics.push({
    name: 'router_routes_count',
    value: 5,
    unit: 'count',
    category: 'router'
  });
  
  return { diagnostics, suggestions, metrics };
}

function analyzeRouteComponent(component: ExoComponentInfo) {
  const diagnostics: ExoDiagnostic[] = [];
  const suggestions: ExoSuggestion[] = [];
  
  // Check for common route component issues
  if (!component.props.some(p => p.name.includes('match') || p.name.includes('params'))) {
    suggestions.push({
      id: 'route-params-usage',
      title: 'Consider using route parameters',
      description: 'Route components can access URL parameters for dynamic content',
      category: 'functionality',
      impact: 'medium',
      effort: 'low',
      location: component.location
    });
  }
  
  return { diagnostics, suggestions };
}

function analyzeGuardComponent(component: ExoComponentInfo) {
  const diagnostics: ExoDiagnostic[] = [];
  const suggestions: ExoSuggestion[] = [];
  
  // Check guard patterns
  if (component.name.includes('Auth') && !component.imports.some(imp => imp.includes('auth'))) {
    suggestions.push({
      id: 'guard-auth-import',
      title: 'Import authentication utilities',
      description: 'Auth guards should import proper authentication helpers',
      category: 'security',
      impact: 'high',
      effort: 'low',
      location: component.location
    });
  }
  
  return { diagnostics, suggestions };
}

async function analyzeProjectRouter(_context: ExoAnalysisContext): Promise<ExoRouterConfigInfo> {
  // Mock analysis - would scan for actual router configurations
  return {
    routes: [
      {
        path: '/',
        component: 'HomePage',
        guards: [],
        lazy: false,
        nested: false,
        params: [],
        location: { file: 'src/routes.ts', line: 5, column: 1 }
      },
      {
        path: '/dashboard',
        component: 'Dashboard',
        guards: ['authGuard'],
        lazy: true,
        nested: true,
        params: [],
        location: { file: 'src/routes.ts', line: 10, column: 1 }
      }
    ],
    guards: [
      {
        name: 'authGuard',
        type: 'beforeEnter',
        async: true,
        location: { file: 'src/guards/auth.ts', line: 5, column: 1 },
        dependencies: ['userService', 'tokenStorage'],
        complexity: 'medium',
        routes: ['/dashboard', '/profile']
      }
    ],
    patterns: [
      {
        name: 'Protected Routes',
        description: 'Routes requiring authentication',
        occurrences: 3,
        examples: [{ file: 'src/routes.ts', line: 10, column: 1 }],
        recommendations: ['Use consistent guard patterns', 'Add loading states']
      }
    ],
    security: {
      protectedRoutes: 3,
      publicRoutes: 2,
      guardCoverage: 60,
      vulnerabilities: []
    }
  };
}

function generateRouterAIContext(routerInfo: ExoRouterConfigInfo): string {
  const { routes, guards, security } = routerInfo;
  
  return `
# @exodra/router Analysis

## Route Architecture
This project uses @exodra/router with ${routes.length} total routes.

### Route Security
- **Protected Routes**: ${security.protectedRoutes} (require authentication)
- **Public Routes**: ${security.publicRoutes} (open access)
- **Guard Coverage**: ${security.guardCoverage}%

### Guard System
The router uses ${guards.length} guard functions:
${guards.map(g => `
- **${g.name}**: ${g.type} guard
  - Complexity: ${g.complexity}
  - Async: ${g.async}
  - Protects ${g.routes.length} routes
`).join('')}

### Route Patterns
${routerInfo.patterns.map(p => `
#### ${p.name}
${p.description} (${p.occurrences} instances)
Recommendations: ${p.recommendations.join(', ')}
`).join('')}

### Integration with Exodra
- Router uses reactive bindables for location and match state
- Guards can access schema validation and reactive context
- Components receive typed route parameters
- Lazy loading integrates with Exodra's component system

This setup provides type-safe routing with reactive state management.
`;
}