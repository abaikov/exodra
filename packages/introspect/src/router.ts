/**
 * Router analysis and route introspection
 */

import type { ExoAnalysisResult, ExoDiagnostic, ExoSuggestion, ExoMetric, ExoSourceLocation } from './types.js';

export interface ExoRouterAnalysis extends ExoAnalysisResult {
  routes: ExoRouteInfo[];
  structure: ExoRouteStructure;
  guards: ExoRouteGuard[];
  optimization: ExoRouterOptimization;
  accessibility: ExoAccessibilityAnalysis;
}

export interface ExoRouteInfo {
  path: string;
  name?: string;
  component: string;
  location: ExoSourceLocation;
  props: ExoRouteProp[];
  params: ExoRouteParam[];
  guards: string[];
  metadata: ExoRouteMetadata;
  lazy: boolean;
  nested: ExoRouteInfo[];
  usage: ExoRouteUsage;
}

export interface ExoRouteProp {
  name: string;
  type: string;
  required: boolean;
  source: 'params' | 'query' | 'state' | 'props';
}

export interface ExoRouteParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'custom';
  pattern?: string;
  required: boolean;
  validation?: string;
}

export interface ExoRouteMetadata {
  title?: string;
  description?: string;
  tags: string[];
  auth?: 'required' | 'optional' | 'forbidden';
  role?: string[];
  permissions?: string[];
  seo?: ExoSEOData;
}

export interface ExoSEOData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
}

export interface ExoRouteUsage {
  frequency: number;
  averageTime: number; // ms spent on route
  bounceRate: number; // percentage
  conversions: number;
  lastAccessed?: string;
}

export interface ExoRouteStructure {
  totalRoutes: number;
  nestedLevels: number;
  publicRoutes: number;
  protectedRoutes: number;
  dynamicRoutes: number;
  hierarchy: ExoRouteHierarchy;
}

export interface ExoRouteHierarchy {
  name: string;
  path: string;
  children: ExoRouteHierarchy[];
  depth: number;
  type: 'layout' | 'page' | 'redirect' | 'catch-all';
}

export interface ExoRouteGuard {
  name: string;
  type: 'auth' | 'role' | 'permission' | 'custom';
  location: ExoSourceLocation;
  routes: string[];
  logic: string;
  async: boolean;
}

export interface ExoRouterOptimization {
  bundleSplitting: ExoBundleSplit[];
  preloading: ExoPreloadOpportunity[];
  caching: ExoCacheStrategy[];
  performance: ExoRoutePerformance[];
}

export interface ExoBundleSplit {
  route: string;
  component: string;
  estimatedSize: number; // KB
  loadTime: number; // ms
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface ExoPreloadOpportunity {
  fromRoute: string;
  toRoute: string;
  probability: number; // 0-1
  benefit: number; // ms saved
  strategy: 'hover' | 'visible' | 'immediate';
}

export interface ExoCacheStrategy {
  route: string;
  data: string[];
  strategy: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
  ttl: number; // seconds
  invalidation: string[];
}

export interface ExoRoutePerformance {
  route: string;
  metrics: {
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
    bundleSize: number;
  };
  issues: string[];
  optimizations: string[];
}

export interface ExoAccessibilityAnalysis {
  score: number; // 0-100
  issues: ExoA11yIssue[];
  recommendations: string[];
  skipLinks: ExoSkipLink[];
  navigation: ExoNavigationAnalysis;
}

export interface ExoA11yIssue {
  route: string;
  type: 'focus' | 'aria' | 'heading' | 'color' | 'keyboard';
  severity: 'error' | 'warning' | 'info';
  description: string;
  fix: string;
}

export interface ExoSkipLink {
  route: string;
  present: boolean;
  targets: string[];
  effective: boolean;
}

export interface ExoNavigationAnalysis {
  breadcrumbs: boolean;
  menuStructure: 'flat' | 'hierarchical' | 'mixed';
  keyboardAccessible: boolean;
  screenReaderFriendly: boolean;
}

export class ExoRouterAnalyzer {
  
  /**
   * Analyze router configuration and routes
   */
  async analyzeRouter(projectRoot: string): Promise<ExoRouterAnalysis> {
    const diagnostics: ExoDiagnostic[] = [];
    const suggestions: ExoSuggestion[] = [];
    const metrics: ExoMetric[] = [];
    
    // Discover routes
    const routes = await this.discoverRoutes(projectRoot);
    
    // Analyze route structure
    const structure = this.analyzeStructure(routes);
    
    // Find guards
    const guards = await this.findGuards(projectRoot);
    
    // Generate optimization opportunities
    const optimization = this.analyzeOptimizations(routes);
    
    // Accessibility analysis
    const accessibility = this.analyzeAccessibility(routes);
    
    // Generate diagnostics
    routes.forEach(route => {
      const routeDiagnostics = this.analyzeRoute(route);
      diagnostics.push(...routeDiagnostics.diagnostics);
      suggestions.push(...routeDiagnostics.suggestions);
    });
    
    // Route-specific metrics
    metrics.push(
      {
        name: 'total_routes',
        value: routes.length,
        unit: 'count',
        category: 'routing'
      },
      {
        name: 'nested_levels',
        value: structure.nestedLevels,
        unit: 'levels',
        category: 'complexity',
        threshold: { warning: 4, error: 6 }
      },
      {
        name: 'protected_routes_ratio',
        value: Math.round((structure.protectedRoutes / structure.totalRoutes) * 100),
        unit: 'percentage',
        category: 'security'
      },
      {
        name: 'accessibility_score',
        value: accessibility.score,
        unit: 'score',
        category: 'accessibility',
        threshold: { warning: 80, error: 60 }
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
      },
      routes,
      structure,
      guards,
      optimization,
      accessibility
    };
  }
  
  /**
   * Generate AI-friendly route context
   */
  generateAIContext(routes: ExoRouteInfo[]): string {
    const sections = [
      '# Application Routes\n',
      '## Route Structure\n'
    ];
    
    // Public routes
    const publicRoutes = routes.filter(r => !r.guards.length);
    if (publicRoutes.length > 0) {
      sections.push('### Public Routes\n');
      publicRoutes.forEach(route => {
        sections.push(`- **${route.path}** → ${route.component}`);
        if (route.metadata.title) sections.push(` (${route.metadata.title})`);
        sections.push('\n');
        
        if (route.params.length > 0) {
          sections.push(`  - Parameters: ${route.params.map(p => `${p.name}:${p.type}`).join(', ')}\n`);
        }
        
        if (route.metadata.description) {
          sections.push(`  - ${route.metadata.description}\n`);
        }
      });
      sections.push('\n');
    }
    
    // Protected routes
    const protectedRoutes = routes.filter(r => r.guards.length > 0);
    if (protectedRoutes.length > 0) {
      sections.push('### Protected Routes\n');
      protectedRoutes.forEach(route => {
        sections.push(`- **${route.path}** → ${route.component}`);
        if (route.metadata.title) sections.push(` (${route.metadata.title})`);
        sections.push(`\n  - Guards: ${route.guards.join(', ')}\n`);
        
        if (route.metadata.role?.length) {
          sections.push(`  - Required roles: ${route.metadata.role.join(', ')}\n`);
        }
        
        if (route.metadata.description) {
          sections.push(`  - ${route.metadata.description}\n`);
        }
      });
      sections.push('\n');
    }
    
    // Dynamic routes
    const dynamicRoutes = routes.filter(r => r.path.includes(':') || r.path.includes('*'));
    if (dynamicRoutes.length > 0) {
      sections.push('### Dynamic Routes\n');
      dynamicRoutes.forEach(route => {
        sections.push(`- **${route.path}** → ${route.component}\n`);
        if (route.params.length > 0) {
          route.params.forEach(param => {
            sections.push(`  - :${param.name} (${param.type})`);
            if (param.validation) sections.push(` - validates: ${param.validation}`);
            sections.push('\n');
          });
        }
      });
      sections.push('\n');
    }
    
    // Nested routes
    const nestedRoutes = routes.filter(r => r.nested.length > 0);
    if (nestedRoutes.length > 0) {
      sections.push('### Nested Route Layouts\n');
      nestedRoutes.forEach(route => {
        sections.push(`- **${route.path}** (Layout: ${route.component})\n`);
        route.nested.forEach(nested => {
          sections.push(`  - ${nested.path} → ${nested.component}`);
          if (nested.metadata.title) sections.push(` (${nested.metadata.title})`);
          sections.push('\n');
        });
      });
      sections.push('\n');
    }
    
    // Route metadata summary
    const routesWithMeta = routes.filter(r => r.metadata.tags.length > 0);
    if (routesWithMeta.length > 0) {
      sections.push('### Route Categories\n');
      const tagGroups = this.groupRoutesByTags(routesWithMeta);
      Object.entries(tagGroups).forEach(([tag, routeList]) => {
        sections.push(`- **${tag}**: ${routeList.map(r => r.path).join(', ')}\n`);
      });
      sections.push('\n');
    }
    
    return sections.join('');
  }
  
  /**
   * Generate route sitemap for AI understanding
   */
  generateSitemap(routes: ExoRouteInfo[]): ExoSitemapEntry[] {
    return routes.map(route => ({
      url: route.path,
      title: route.metadata.title || route.name || route.component,
      description: route.metadata.description,
      component: route.component,
      auth: route.metadata.auth,
      params: route.params.map(p => p.name),
      tags: route.metadata.tags,
      children: route.nested.map(nested => ({
        url: nested.path,
        title: nested.metadata.title || nested.name || nested.component,
        component: nested.component
      }))
    }));
  }
  
  /**
   * Discover routes in the project
   */
  private async discoverRoutes(_projectRoot: string): Promise<ExoRouteInfo[]> {
    // Mock route discovery - would parse router configuration files
    return [
      {
        path: '/',
        name: 'home',
        component: 'HomePage',
        location: { file: 'src/pages/HomePage.tsx', line: 1, column: 1 },
        props: [],
        params: [],
        guards: [],
        metadata: {
          title: 'Home',
          description: 'Application homepage',
          tags: ['public', 'landing'],
          auth: 'optional',
          seo: {
            title: 'Welcome to ExoApp',
            description: 'The best Exodra application',
            keywords: ['exodra', 'react', 'typescript']
          }
        },
        lazy: false,
        nested: [],
        usage: {
          frequency: 1500,
          averageTime: 3000,
          bounceRate: 25,
          conversions: 12
        }
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: 'DashboardLayout',
        location: { file: 'src/pages/DashboardLayout.tsx', line: 1, column: 1 },
        props: [],
        params: [],
        guards: ['authGuard'],
        metadata: {
          title: 'Dashboard',
          description: 'User dashboard with analytics',
          tags: ['protected', 'analytics'],
          auth: 'required',
          role: ['user', 'admin']
        },
        lazy: true,
        nested: [
          {
            path: '/analytics',
            name: 'analytics',
            component: 'AnalyticsPage',
            location: { file: 'src/pages/AnalyticsPage.tsx', line: 1, column: 1 },
            props: [],
            params: [],
            guards: ['authGuard'],
            metadata: {
              title: 'Analytics',
              description: 'View application analytics',
              tags: ['analytics', 'charts'],
              auth: 'required'
            },
            lazy: true,
            nested: [],
            usage: {
              frequency: 800,
              averageTime: 5000,
              bounceRate: 15,
              conversions: 5
            }
          }
        ],
        usage: {
          frequency: 1200,
          averageTime: 4500,
          bounceRate: 20,
          conversions: 8
        }
      },
      {
        path: '/users/:id',
        name: 'user-profile',
        component: 'UserProfilePage',
        location: { file: 'src/pages/UserProfilePage.tsx', line: 1, column: 1 },
        props: [
          { name: 'userId', type: 'string', required: true, source: 'params' }
        ],
        params: [
          { name: 'id', type: 'string', required: true, pattern: '[0-9]+', validation: 'numeric' }
        ],
        guards: ['authGuard', 'userAccessGuard'],
        metadata: {
          title: 'User Profile',
          description: 'View and edit user profile',
          tags: ['user', 'profile', 'protected'],
          auth: 'required',
          permissions: ['user.read', 'user.update']
        },
        lazy: true,
        nested: [],
        usage: {
          frequency: 600,
          averageTime: 7000,
          bounceRate: 30,
          conversions: 3
        }
      }
    ];
  }
  
  /**
   * Analyze route structure
   */
  private analyzeStructure(routes: ExoRouteInfo[]): ExoRouteStructure {
    const totalRoutes = routes.length + routes.reduce((sum, r) => sum + r.nested.length, 0);
    const nestedLevels = Math.max(...routes.map(r => this.getNestedDepth(r, 0)));
    const publicRoutes = routes.filter(r => r.guards.length === 0).length;
    const protectedRoutes = totalRoutes - publicRoutes;
    const dynamicRoutes = routes.filter(r => r.params.length > 0).length;
    
    const hierarchy = this.buildHierarchy(routes);
    
    return {
      totalRoutes,
      nestedLevels,
      publicRoutes,
      protectedRoutes,
      dynamicRoutes,
      hierarchy
    };
  }
  
  /**
   * Find route guards
   */
  private async findGuards(_projectRoot: string): Promise<ExoRouteGuard[]> {
    // Mock guard discovery
    return [
      {
        name: 'authGuard',
        type: 'auth',
        location: { file: 'src/guards/authGuard.ts', line: 10, column: 1 },
        routes: ['/dashboard', '/users/:id'],
        logic: 'Check if user is authenticated',
        async: true
      },
      {
        name: 'userAccessGuard',
        type: 'permission',
        location: { file: 'src/guards/userAccessGuard.ts', line: 15, column: 1 },
        routes: ['/users/:id'],
        logic: 'Check if user can access specific user profile',
        async: true
      }
    ];
  }
  
  /**
   * Analyze optimizations
   */
  private analyzeOptimizations(routes: ExoRouteInfo[]): ExoRouterOptimization {
    const bundleSplitting: ExoBundleSplit[] = routes
      .filter(r => r.lazy)
      .map(route => ({
        route: route.path,
        component: route.component,
        estimatedSize: 45, // KB
        loadTime: 200, // ms
        priority: route.usage.frequency > 1000 ? 'high' : 'medium',
        recommendation: 'Already optimized with lazy loading'
      }));
    
    const preloading: ExoPreloadOpportunity[] = [
      {
        fromRoute: '/',
        toRoute: '/dashboard',
        probability: 0.8,
        benefit: 150,
        strategy: 'hover'
      }
    ];
    
    const caching: ExoCacheStrategy[] = [
      {
        route: '/dashboard',
        data: ['userPreferences', 'analyticsData'],
        strategy: 'memory',
        ttl: 300,
        invalidation: ['user.updated', 'logout']
      }
    ];
    
    const performance: ExoRoutePerformance[] = routes.map(route => ({
      route: route.path,
      metrics: {
        loadTime: route.lazy ? 250 : 50,
        renderTime: 16.7,
        memoryUsage: 2.5,
        bundleSize: route.lazy ? 45 : 15
      },
      issues: route.usage.averageTime > 5000 ? ['High time on page'] : [],
      optimizations: route.lazy ? [] : ['Consider lazy loading']
    }));
    
    return {
      bundleSplitting,
      preloading,
      caching,
      performance
    };
  }
  
  /**
   * Analyze accessibility
   */
  private analyzeAccessibility(routes: ExoRouteInfo[]): ExoAccessibilityAnalysis {
    const issues: ExoA11yIssue[] = [];
    
    // Check for missing page titles
    routes.forEach(route => {
      if (!route.metadata.title) {
        issues.push({
          route: route.path,
          type: 'aria',
          severity: 'warning',
          description: 'Route missing page title for screen readers',
          fix: 'Add title to route metadata'
        });
      }
    });
    
    const skipLinks: ExoSkipLink[] = routes.map(route => ({
      route: route.path,
      present: true, // Mock data
      targets: ['#main-content', '#navigation'],
      effective: true
    }));
    
    const navigation: ExoNavigationAnalysis = {
      breadcrumbs: true,
      menuStructure: 'hierarchical',
      keyboardAccessible: true,
      screenReaderFriendly: true
    };
    
    const score = Math.max(0, 100 - (issues.length * 10));
    
    return {
      score,
      issues,
      recommendations: [
        'Add page titles to all routes',
        'Ensure consistent navigation patterns',
        'Test with screen readers'
      ],
      skipLinks,
      navigation
    };
  }
  
  /**
   * Analyze individual route
   */
  private analyzeRoute(route: ExoRouteInfo): { diagnostics: ExoDiagnostic[], suggestions: ExoSuggestion[] } {
    const diagnostics: ExoDiagnostic[] = [];
    const suggestions: ExoSuggestion[] = [];
    
    // Check for missing metadata
    if (!route.metadata.title) {
      suggestions.push({
        id: 'route-title',
        title: 'Add route title',
        description: `Route ${route.path} should have a title for accessibility`,
        location: route.location,
        category: 'accessibility',
        impact: 'medium',
        effort: 'low'
      });
    }
    
    // Check parameter validation
    route.params.forEach(param => {
      if (!param.validation && param.type !== 'string') {
        suggestions.push({
          id: 'param-validation',
          title: 'Add parameter validation',
          description: `Parameter :${param.name} should have validation`,
          location: route.location,
          category: 'validation',
          impact: 'medium',
          effort: 'low'
        });
      }
    });
    
    // Check for high bounce rate
    if (route.usage.bounceRate > 50) {
      diagnostics.push({
        id: 'high-bounce-rate',
        severity: 'warning',
        message: `Route ${route.path} has high bounce rate (${route.usage.bounceRate}%)`,
        location: route.location,
        category: 'ux'
      });
    }
    
    return { diagnostics, suggestions };
  }
  
  /**
   * Helper methods
   */
  private getNestedDepth(route: ExoRouteInfo, depth: number): number {
    if (route.nested.length === 0) return depth;
    return Math.max(...route.nested.map(nested => this.getNestedDepth(nested, depth + 1)));
  }
  
  private buildHierarchy(routes: ExoRouteInfo[]): ExoRouteHierarchy {
    return {
      name: 'root',
      path: '/',
      children: routes.map(route => ({
        name: route.name || route.component,
        path: route.path,
        children: route.nested.map(nested => ({
          name: nested.name || nested.component,
          path: nested.path,
          children: [],
          depth: 2,
          type: 'page'
        })),
        depth: 1,
        type: route.nested.length > 0 ? 'layout' : 'page'
      })),
      depth: 0,
      type: 'layout'
    };
  }
  
  private groupRoutesByTags(routes: ExoRouteInfo[]): Record<string, ExoRouteInfo[]> {
    const groups: Record<string, ExoRouteInfo[]> = {};
    
    routes.forEach(route => {
      route.metadata.tags.forEach(tag => {
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(route);
      });
    });
    
    return groups;
  }
}

export interface ExoSitemapEntry {
  url: string;
  title?: string;
  description?: string;
  component: string;
  auth?: 'required' | 'optional' | 'forbidden';
  params?: string[];
  tags?: string[];
  children?: Array<{
    url: string;
    title?: string;
    component: string;
  }>;
}