/**
 * Developer tooling integrations and utilities
 */

import type { AnalysisResult } from './types.js';

export interface ToolIntegration {
  name: string;
  type: 'eslint' | 'prettier' | 'vscode' | 'ide' | 'ci-cd' | 'bundler';
  status: 'available' | 'configured' | 'missing' | 'outdated';
  configuration?: Record<string, unknown>;
  suggestions: string[];
}

export interface ESLintIntegration {
  rules: ESLintRule[];
  config: ESLintConfig;
  fixableIssues: number;
  performanceRules: ESLintRule[];
}

export interface ESLintRule {
  name: string;
  severity: 'error' | 'warn' | 'off';
  category: 'exodra' | 'performance' | 'typescript' | 'style';
  description: string;
  fixable: boolean;
  recommended: boolean;
}

export interface ESLintConfig {
  extends: string[];
  plugins: string[];
  rules: Record<string, unknown>;
  overrides?: Record<string, unknown>[];
}

export interface VSCodeIntegration {
  extensions: VSCodeExtension[];
  settings: VSCodeSettings;
  snippets: VSCodeSnippet[];
  tasks: VSCodeTask[];
}

export interface VSCodeExtension {
  id: string;
  name: string;
  required: boolean;
  purpose: string;
  configuration?: Record<string, unknown>;
}

export interface VSCodeSettings {
  typescript: Record<string, unknown>;
  eslint: Record<string, unknown>;
  exodra: Record<string, unknown>;
  editor: Record<string, unknown>;
}

export interface VSCodeSnippet {
  name: string;
  prefix: string;
  body: string[];
  description: string;
  scope: string;
}

export interface VSCodeTask {
  label: string;
  type: string;
  command: string;
  group: string;
  presentation: Record<string, unknown>;
}

export interface CIConfig {
  platform: 'github' | 'gitlab' | 'jenkins' | 'circle-ci';
  stages: CIStage[];
  optimizations: CIOptimization[];
  recommendations: string[];
}

export interface CIStage {
  name: string;
  commands: string[];
  cache?: string[];
  artifacts?: string[];
  estimatedTime: number; // minutes
}

export interface CIOptimization {
  type: 'caching' | 'parallelization' | 'dependency-optimization';
  description: string;
  estimatedSavings: number; // minutes
  implementation: string[];
}

export interface BundlerIntegration {
  bundler: 'vite' | 'webpack' | 'rollup' | 'esbuild';
  configuration: Record<string, unknown>;
  optimizations: BundlerOptimization[];
  analysis: BundleAnalysis;
}

export interface BundlerOptimization {
  type: 'code-splitting' | 'tree-shaking' | 'compression' | 'lazy-loading';
  description: string;
  impact: {
    bundleSize: number; // KB reduction
    loadTime: number; // ms improvement
  };
  implementation: string[];
}

export interface BundleAnalysis {
  totalSize: number; // KB
  gzipSize: number; // KB
  chunks: BundleChunk[];
  dependencies: DependencyAnalysis[];
  recommendations: string[];
}

export interface BundleChunk {
  name: string;
  size: number; // KB
  modules: number;
  isLazy: boolean;
  dependencies: string[];
}

export interface DependencyAnalysis {
  name: string;
  size: number; // KB
  usage: 'full' | 'partial' | 'unused';
  alternatives?: string[];
  recommendation: string;
}

export class DeveloperTools {
  /**
   * Generate comprehensive developer tooling setup
   */
  async generateToolingSetup(projectRoot: string, analysisResult: AnalysisResult): Promise<{
    eslint: ESLintIntegration;
    vscode: VSCodeIntegration;
    ci: CIConfig;
    bundler: BundlerIntegration;
    recommendations: string[];
  }> {
    const eslint = this.generateESLintConfig(analysisResult);
    const vscode = this.generateVSCodeConfig(analysisResult);
    const ci = this.generateCIConfig(projectRoot);
    const bundler = this.generateBundlerConfig(analysisResult);
    
    const recommendations = [
      'Set up pre-commit hooks for automated code quality checks',
      'Configure automated dependency updates with Dependabot',
      'Implement performance budgets in CI pipeline',
      'Add automated accessibility testing',
      'Set up Exodra-specific linting rules for best practices'
    ];
    
    return {
      eslint,
      vscode,
      ci,
      bundler,
      recommendations
    };
  }
  
  /**
   * Generate ESLint configuration optimized for Exodra
   */
  private generateESLintConfig(_analysisResult: AnalysisResult): ESLintIntegration {
    const performanceRules: ESLintRule[] = [
      {
        name: 'exodra/no-inline-objects',
        severity: 'warn',
        category: 'exodra',
        description: 'Prevent inline object creation in render functions',
        fixable: true,
        recommended: true
      },
      {
        name: 'exodra/prefer-derived-signals',
        severity: 'warn',
        category: 'exodra',
        description: 'Suggest derived signals for computed values',
        fixable: false,
        recommended: true
      },
      {
        name: 'exodra/signal-dependencies',
        severity: 'error',
        category: 'exodra',
        description: 'Ensure signal dependencies are properly declared',
        fixable: false,
        recommended: true
      },
      {
        name: 'exodra/schema-validation',
        severity: 'warn',
        category: 'exodra',
        description: 'Require validation for schema definitions',
        fixable: false,
        recommended: true
      }
    ];
    
    const rules: ESLintRule[] = [
      ...performanceRules,
      {
        name: '@typescript-eslint/no-unused-vars',
        severity: 'error',
        category: 'typescript',
        description: 'Disallow unused variables',
        fixable: true,
        recommended: true
      },
      {
        name: '@typescript-eslint/explicit-function-return-type',
        severity: 'warn',
        category: 'typescript',
        description: 'Require explicit return types',
        fixable: false,
        recommended: false
      }
    ];
    
    const config: ESLintConfig = {
      extends: [
        '@eslint/js/recommended',
        '@typescript-eslint/recommended',
        'plugin:exodra/recommended'
      ],
      plugins: [
        '@typescript-eslint',
        'exodra'
      ],
      rules: {
        'exodra/no-inline-objects': 'warn',
        'exodra/prefer-derived-signals': 'warn',
        'exodra/signal-dependencies': 'error',
        'exodra/schema-validation': 'warn',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn'
      }
    };
    
    return {
      rules,
      config,
      fixableIssues: rules.filter(r => r.fixable).length,
      performanceRules
    };
  }
  
  /**
   * Generate VS Code configuration
   */
  private generateVSCodeConfig(_analysisResult: AnalysisResult): VSCodeIntegration {
    const extensions: VSCodeExtension[] = [
      {
        id: 'exodra.exodra-vscode',
        name: 'Exodra Language Support',
        required: true,
        purpose: 'Syntax highlighting and IntelliSense for Exodra'
      },
      {
        id: 'bradlc.vscode-tailwindcss',
        name: 'Tailwind CSS IntelliSense',
        required: false,
        purpose: 'CSS class suggestions and validation'
      },
      {
        id: 'ms-vscode.vscode-typescript-next',
        name: 'TypeScript Importer',
        required: true,
        purpose: 'Enhanced TypeScript support'
      },
      {
        id: 'esbenp.prettier-vscode',
        name: 'Prettier',
        required: true,
        purpose: 'Code formatting'
      }
    ];
    
    const settings: VSCodeSettings = {
      typescript: {
        preferences: {
          includePackageJsonAutoImports: 'on'
        },
        suggest: {
          autoImports: true
        }
      },
      eslint: {
        enable: true,
        format: { enable: true },
        lintTask: { enable: true }
      },
      exodra: {
        enableIntelliSense: true,
        showSchemaInlay: true,
        performanceHints: true
      },
      editor: {
        formatOnSave: true,
        codeActionsOnSave: {
          'source.fixAll.eslint': true,
          'source.organizeImports': true
        }
      }
    };
    
    const snippets: VSCodeSnippet[] = [
      {
        name: 'Exodra Component',
        prefix: 'exo-component',
        body: [
          'import { schema } from \'@exodra/core\';',
          '',
          'const ${1:ComponentName}Schema = schema({',
          '  // Define your schema here',
          '});',
          '',
          'export function ${1:ComponentName}(props: typeof ${1:ComponentName}Schema) {',
          '  return (',
          '    <div>',
          '      ${0}',
          '    </div>',
          '  );',
          '}'
        ],
        description: 'Create a new Exodra component with schema',
        scope: 'typescript,typescriptreact'
      },
      {
        name: 'Bindable Signal',
        prefix: 'exo-bindable',
        body: [
          'const ${1:signalName} = bindable(${2:initialValue});'
        ],
        description: 'Create a bindable signal',
        scope: 'typescript,typescriptreact'
      }
    ];
    
    const tasks: VSCodeTask[] = [
      {
        label: 'Exodra: Analyze Project',
        type: 'shell',
        command: 'npx @exodra/introspect analyze',
        group: 'build',
        presentation: {
          echo: true,
          reveal: 'always',
          focus: false,
          panel: 'shared'
        }
      },
      {
        label: 'Exodra: Performance Check',
        type: 'shell',
        command: 'npx @exodra/introspect quick-check',
        group: 'test',
        presentation: {
          echo: true,
          reveal: 'always',
          focus: false,
          panel: 'shared'
        }
      }
    ];
    
    return {
      extensions,
      settings,
      snippets,
      tasks
    };
  }
  
  /**
   * Generate CI/CD configuration
   */
  private generateCIConfig(_projectRoot: string): CIConfig {
    const stages: CIStage[] = [
      {
        name: 'Install Dependencies',
        commands: [
          'npm ci --prefer-offline --no-audit'
        ],
        cache: ['~/.npm', 'node_modules'],
        estimatedTime: 2
      },
      {
        name: 'Type Check',
        commands: [
          'npm run typecheck'
        ],
        estimatedTime: 1
      },
      {
        name: 'Lint',
        commands: [
          'npm run lint',
          'npm run lint:exodra'
        ],
        estimatedTime: 1
      },
      {
        name: 'Test',
        commands: [
          'npm run test:unit',
          'npm run test:integration'
        ],
        cache: ['coverage'],
        estimatedTime: 5
      },
      {
        name: 'Exodra Analysis',
        commands: [
          'npx @exodra/introspect analyze --format=json > analysis.json',
          'npx @exodra/introspect check-thresholds analysis.json'
        ],
        artifacts: ['analysis.json'],
        estimatedTime: 3
      },
      {
        name: 'Build',
        commands: [
          'npm run build',
          'npm run build:analyze'
        ],
        artifacts: ['dist', 'bundle-analysis.json'],
        estimatedTime: 3
      },
      {
        name: 'Performance Tests',
        commands: [
          'npm run test:performance',
          'npm run lighthouse'
        ],
        estimatedTime: 5
      }
    ];
    
    const optimizations: CIOptimization[] = [
      {
        type: 'caching',
        description: 'Cache node_modules and build artifacts',
        estimatedSavings: 3,
        implementation: [
          'Use npm ci with offline cache',
          'Cache TypeScript build info',
          'Cache ESLint cache files'
        ]
      },
      {
        type: 'parallelization',
        description: 'Run lint, typecheck, and tests in parallel',
        estimatedSavings: 2,
        implementation: [
          'Use matrix builds for different Node versions',
          'Run lint and typecheck jobs concurrently',
          'Parallel test execution with --maxWorkers'
        ]
      }
    ];
    
    const recommendations = [
      'Set up performance budgets to catch regressions',
      'Add automated security scanning with npm audit',
      'Implement progressive deployment with feature flags',
      'Add Exodra-specific performance benchmarks',
      'Use semantic-release for automated versioning'
    ];
    
    return {
      platform: 'github',
      stages,
      optimizations,
      recommendations
    };
  }
  
  /**
   * Generate bundler optimization configuration
   */
  private generateBundlerConfig(_analysisResult: AnalysisResult): BundlerIntegration {
    const optimizations: BundlerOptimization[] = [
      {
        type: 'code-splitting',
        description: 'Split vendor dependencies and route-based chunks',
        impact: {
          bundleSize: 0, // No size reduction, but better caching
          loadTime: 200 // Faster initial load
        },
        implementation: [
          'Configure dynamic imports for routes',
          'Create vendor chunk for stable dependencies',
          'Split Exodra runtime into separate chunk'
        ]
      },
      {
        type: 'tree-shaking',
        description: 'Remove unused code and optimize imports',
        impact: {
          bundleSize: 50,
          loadTime: 100
        },
        implementation: [
          'Enable ES modules in package.json',
          'Use sideEffects: false for pure modules',
          'Configure proper module resolution'
        ]
      },
      {
        type: 'compression',
        description: 'Enable gzip and brotli compression',
        impact: {
          bundleSize: 150, // Effective size reduction
          loadTime: 300
        },
        implementation: [
          'Configure compression in build pipeline',
          'Set up CDN with compression support',
          'Add compression headers'
        ]
      }
    ];
    
    const chunks: BundleChunk[] = [
      {
        name: 'vendor',
        size: 120,
        modules: 15,
        isLazy: false,
        dependencies: ['react', '@exodra/core']
      },
      {
        name: 'main',
        size: 85,
        modules: 25,
        isLazy: false,
        dependencies: ['./src/App', './src/components']
      },
      {
        name: 'dashboard',
        size: 45,
        modules: 8,
        isLazy: true,
        dependencies: ['./src/pages/Dashboard']
      }
    ];
    
    const dependencies: DependencyAnalysis[] = [
      {
        name: '@exodra/core',
        size: 25,
        usage: 'full',
        recommendation: 'Well optimized, no action needed'
      },
      {
        name: 'lodash',
        size: 60,
        usage: 'partial',
        alternatives: ['lodash-es', 'custom utilities'],
        recommendation: 'Consider tree-shakeable alternative or custom utilities'
      }
    ];
    
    const analysis: BundleAnalysis = {
      totalSize: 250,
      gzipSize: 85,
      chunks,
      dependencies,
      recommendations: [
        'Switch to lodash-es for better tree-shaking',
        'Implement route-based code splitting',
        'Add bundle size monitoring to CI',
        'Consider preloading critical chunks'
      ]
    };
    
    const configuration = {
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['@exodra/core', 'react'],
              utils: ['lodash', 'date-fns']
            }
          }
        },
        chunkSizeWarningLimit: 100
      },
      optimizeDeps: {
        include: ['@exodra/core']
      }
    };
    
    return {
      bundler: 'vite',
      configuration,
      optimizations,
      analysis
    };
  }
}