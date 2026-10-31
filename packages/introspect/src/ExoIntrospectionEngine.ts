/**
 * Core introspection engine for analyzing Exodra projects
 */

import { Project, SourceFile, SyntaxKind, DiagnosticMessageChain, Node } from 'ts-morph';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs';
import type { TExoAnalysisResult } from './types/TExoAnalysisResult.js';
import type { TExoDiagnostic } from './types/TExoDiagnostic.js';
import type { TExoSuggestion } from './types/TExoSuggestion.js';
import type { TExoMetric } from './types/TExoMetric.js';
import type { TExoSourceLocation } from './types/TExoSourceLocation.js';
import type { TExoIntrospectionConfig } from './types/TExoIntrospectionConfig.js';
import { EXO_COMPONENT_BUILDERS } from './constants/EXO_COMPONENT_BUILDERS.js';
import { EXO_HOISTED_BUILDERS } from './constants/EXO_HOISTED_BUILDERS.js';
import { EXO_SCHEMA_BUILDERS } from './constants/EXO_SCHEMA_BUILDERS.js';
import { summarizeDiagnostics } from './summarizeDiagnostics.js';

export class ExoIntrospectionEngine {
    private project: Project;
    private config: TExoIntrospectionConfig;

    constructor(config?: Partial<TExoIntrospectionConfig>) {
        this.config = {
            projectRoot: process.cwd(),
            include: ['**/*.ts', '**/*.tsx'],
            exclude: ['node_modules/**', 'dist/**', '**/*.d.ts'],
            analysis: {
                schema: true,
                performance: true,
            },
            ...config,
        } as TExoIntrospectionConfig;

        this.project = this.createProject();
    }

    /**
     * Create a ts-morph Project, gracefully falling back to a tsconfig-less
     * project when the target directory has no tsconfig.json (so analysis works
     * on any folder, not just package roots).
     */
    private createProject(): Project {
        const tsConfigPath =
            this.config.tsconfigPath ||
            (this.config.projectRoot
                ? path.join(this.config.projectRoot, 'tsconfig.json')
                : undefined);
        const useTsConfig = !!tsConfigPath && fs.existsSync(tsConfigPath);

        if (useTsConfig) {
            return new Project({
                tsConfigFilePath: tsConfigPath,
                skipAddingFilesFromTsConfig: false,
                skipFileDependencyResolution: true,
            });
        }

        return new Project({
            compilerOptions: { allowJs: true, jsx: 4 /* react-jsx */ },
            skipAddingFilesFromTsConfig: true,
            skipFileDependencyResolution: true,
        });
    }

    /**
     * Analyze a specific project directory
     */
    async analyzeProject(
        projectPath: string,
        config?: Partial<TExoIntrospectionConfig>
    ): Promise<TExoAnalysisResult> {
        // Update config with new project path
        this.config = {
            ...this.config,
            ...config,
            projectRoot: projectPath,
        };

        // Re-initialize project with new path
        this.project = this.createProject();

        return this.analyze();
    }

    /**
     * Analyze the entire project
     */
    async analyze(): Promise<TExoAnalysisResult> {
        const files = await this.getSourceFiles();
        const diagnostics: TExoDiagnostic[] = [];
        const suggestions: TExoSuggestion[] = [];
        const metrics: TExoMetric[] = [];

        for (const file of files) {
            // A single unparseable/unexpected file should not abort the whole run.
            try {
                const fileAnalysis = await this.analyzeFile(file);
                diagnostics.push(...fileAnalysis.diagnostics);
                suggestions.push(...fileAnalysis.suggestions);
                metrics.push(...fileAnalysis.metrics);
            } catch {
                // skip files that fail to analyze
            }
        }

        // Add project-level metrics
        metrics.push(...this.getProjectMetrics());

        const result: TExoAnalysisResult = {
            diagnostics,
            suggestions,
            metrics,
            summary: summarizeDiagnostics(diagnostics, suggestions),
            analysis: {
                filesAnalyzed: files.length,
                summary: summarizeDiagnostics(diagnostics, suggestions),
                suggestions,
            },
        };

        return result;
    }

    /**
     * Analyze a specific file
     */
    async analyzeFile(sourceFile: SourceFile): Promise<TExoAnalysisResult> {
        const diagnostics: TExoDiagnostic[] = [];
        const suggestions: TExoSuggestion[] = [];
        const metrics: TExoMetric[] = [];

        // TypeScript diagnostics
        const tsDiagnostics = sourceFile.getPreEmitDiagnostics();
        for (const diagnostic of tsDiagnostics) {
            const start = diagnostic.getStart();
            if (start !== undefined) {
                const startPos = sourceFile.getLineAndColumnAtPos(start);
                const length = diagnostic.getLength() || 0;
                const endPos = sourceFile.getLineAndColumnAtPos(start + length);

                diagnostics.push({
                    id: `ts-${diagnostic.getCode()}`,
                    severity:
                        diagnostic.getCategory() === 1
                            ? 'error'
                            : diagnostic.getCategory() === 2
                            ? 'warning'
                            : 'info',
                    message:
                        typeof diagnostic.getMessageText() === 'string'
                            ? (diagnostic.getMessageText() as string)
                            : (
                                  diagnostic.getMessageText() as DiagnosticMessageChain
                              ).getMessageText(),
                    location: {
                        file: sourceFile.getFilePath(),
                        line: startPos.line,
                        column: startPos.column,
                        endLine: endPos.line,
                        endColumn: endPos.column,
                    },
                    category: 'typescript',
                });
            }
        }

        // Exodra-specific analysis
        if (this.config.analysis?.schema) {
            const schemaAnalysis = this.analyzeSchema(sourceFile);
            diagnostics.push(...schemaAnalysis.diagnostics);
            suggestions.push(...schemaAnalysis.suggestions);
        }

        if (this.config.analysis?.performance) {
            const perfAnalysis = this.analyzePerformance(sourceFile);
            diagnostics.push(...perfAnalysis.diagnostics);
            suggestions.push(...perfAnalysis.suggestions);
            metrics.push(...perfAnalysis.metrics);
        }

        return {
            diagnostics,
            suggestions,
            metrics,
            summary: summarizeDiagnostics(diagnostics, suggestions),
        };
    }

    /**
     * Analyze ONE file, named by path.
     *
     * The file is added to the project if it is not already part of it, which is what makes this
     * work on a folder with no tsconfig.
     */
    async analyzeFilePath(filePath: string): Promise<TExoAnalysisResult> {
        const absolute = path.resolve(this.config.projectRoot, filePath);
        const sourceFile =
            this.project.getSourceFile(absolute) ?? this.project.addSourceFileAtPath(absolute);
        return this.analyzeFile(sourceFile);
    }

    /**
     * Get all source files to analyze
     */
    private async getSourceFiles(): Promise<SourceFile[]> {
        const patterns = this.config.include!.map((pattern) =>
            path.resolve(this.config.projectRoot, pattern)
        );

        const files: string[] = [];
        for (const pattern of patterns) {
            const matches = await glob(pattern, {
                ignore: this.config.exclude,
                absolute: true,
            });
            files.push(...matches);
        }

        return files
            .map((file) => {
                // Reuse files already loaded from tsconfig; otherwise add them so
                // analysis also works when there is no tsconfig.
                try {
                    return (
                        this.project.getSourceFile(file) ?? this.project.addSourceFileAtPath(file)
                    );
                } catch {
                    return undefined;
                }
            })
            .filter((file): file is SourceFile => file !== undefined);
    }

    /**
     * WHERE A SCHEMA IS BUILT — the one thing about a schema that a static pass can decide, and
     * the one that changes what the program IS.
     *
     * A schema is built ONCE per process and both backends index their prepared schemas by the
     * port numbers `createExoSchema` assigned. Building one inside a function therefore does not
     * produce a slower program, it produces a different one: a fresh declaration per call, a fresh
     * schema compiled per call, and the markup re-parsed per call. `exoJsx` is compiled to a
     * module-level `const` by `@exodra/babel-plugin-schema` precisely so this cannot
     * happen; a HAND-WRITTEN `createExoSchema(...)` / `createExoStatic(...)` has
     * nothing to stop it.
     *
     * What used to stand here looked for a variable whose TYPE TEXT contained `Schema` or `z.`
     * and suggested adding runtime validation — a rule about Zod, in a package about Exodra,
     * against a model (`h()` schemas with a `validate` prop) that no longer exists.
     */
    private analyzeSchema(sourceFile: SourceFile): {
        diagnostics: TExoDiagnostic[];
        suggestions: TExoSuggestion[];
    } {
        const diagnostics: TExoDiagnostic[] = [];
        const suggestions: TExoSuggestion[] = [];

        sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
            const callee = call.getExpression().getText();
            if (!EXO_SCHEMA_BUILDERS.includes(callee)) return;
            // `exoJsx` is hoisted to module scope by the Babel plugin whatever it is written
            // inside, so it is exempt — the same exemption `no-schema-in-function` makes in
            // `eslint-plugin.ts`. Without it this reported every JSX declaration written in a function as
            // a performance problem, and the two halves of the package disagreed about the same
            // file.
            if (EXO_HOISTED_BUILDERS.includes(callee)) return;
            // At module scope every ancestor up to the file is a statement or a declaration list;
            // inside a function one of them is a function-like node. That is the whole question.
            //
            // THE WALK IS NOT SHARED WITH THE LINT RULE, and cannot be: this one asks ts-morph for
            // ancestors and matches `SyntaxKind`, the rule follows ESTree `parent` links and matches
            // node `type` strings. The four kinds here are the three ESTree function types plus
            // `MethodDeclaration`, which has no ESTree counterpart — there a class method's body IS
            // a `FunctionExpression`, so the rule's three cover what these four cover. Change one
            // list and check the other.
            const insideFunction = call
                .getAncestors()
                .some(
                    (ancestor) =>
                        ancestor.getKind() === SyntaxKind.FunctionDeclaration ||
                        ancestor.getKind() === SyntaxKind.FunctionExpression ||
                        ancestor.getKind() === SyntaxKind.ArrowFunction ||
                        ancestor.getKind() === SyntaxKind.MethodDeclaration
                );
            if (!insideFunction) return;

            // A SUGGESTION AND NOT A DIAGNOSTIC, because there is one shape this cannot tell apart
            // from the mistake: a FACTORY that builds a component and is itself called once at
            // module load — which is what the JSX compiler emits, and what a project's own
            // `makeRow(…)` helper does. Reporting that as an error would be wrong for the framework's
            // own source, so it is raised as something to look at.
            suggestions.push({
                id: 'schema-built-per-call',
                title: 'Build this schema at module scope',
                description:
                    `${callee}() is called inside a function, so unless that function itself runs once ` +
                    'at module load, the schema is built again on every call — with new port numbers ' +
                    'and a freshly compiled schema each time. Move it to module scope, or write the ' +
                    'view as JSX and let the Babel plugin hoist it.',
                location: this.getLocationFromNode(call, sourceFile),
                category: 'schema',
                impact: 'high',
                effort: 'low',
            });
        });

        return { diagnostics, suggestions };
    }

    /**
     * Analyze performance patterns
     */
    private analyzePerformance(sourceFile: SourceFile): {
        diagnostics: TExoDiagnostic[];
        suggestions: TExoSuggestion[];
        metrics: TExoMetric[];
    } {
        const diagnostics: TExoDiagnostic[] = [];
        const suggestions: TExoSuggestion[] = [];
        const metrics: TExoMetric[] = [];

        // Count various metrics
        const componentCount = this.countComponents(sourceFile);
        const complexityScore = this.calculateComplexity(sourceFile);

        metrics.push(
            {
                name: 'components',
                value: componentCount,
                unit: 'count',
                category: 'structure',
            },
            {
                name: 'complexity',
                value: complexityScore,
                unit: 'score',
                category: 'maintainability',
                threshold: { warning: 10, error: 20 },
            }
        );

        // Check complexity thresholds
        if (complexityScore > 20) {
            diagnostics.push({
                id: 'high-complexity',
                severity: 'warning',
                message: `File complexity is high (${complexityScore}). Consider breaking down into smaller modules.`,
                location: { file: sourceFile.getFilePath(), line: 1, column: 1 },
                category: 'maintainability',
            });
        }

        return { diagnostics, suggestions, metrics };
    }

    /**
     * Get project-level metrics
     */
    private getProjectMetrics(): TExoMetric[] {
        const sourceFiles = this.project.getSourceFiles();
        const totalFiles = sourceFiles.length;
        const totalLines = sourceFiles.reduce(
            (sum: number, file: SourceFile) => sum + (file.getEndLineNumber?.() || 0),
            0
        );

        return [
            {
                name: 'total_files',
                value: totalFiles,
                unit: 'count',
                category: 'project',
            },
            {
                name: 'total_lines',
                value: totalLines,
                unit: 'lines',
                category: 'project',
            },
        ];
    }

    // Helper methods
    private getLocationFromNode(node: Node, sourceFile: SourceFile): TExoSourceLocation {
        const start = node.getStart ? node.getStart() : 0;
        const end = node.getEnd ? node.getEnd() : 0;
        const startPos = sourceFile.getLineAndColumnAtPos(start);
        const endPos = sourceFile.getLineAndColumnAtPos(end);

        return {
            file: sourceFile.getFilePath(),
            line: startPos.line,
            column: startPos.column,
            endLine: endPos.line,
            endColumn: endPos.column,
        };
    }

    private countComponents(sourceFile: SourceFile): number {
        return this.countCallsTo(sourceFile, EXO_COMPONENT_BUILDERS);
    }

    private countCallsTo(sourceFile: SourceFile, callees: readonly string[]): number {
        return sourceFile
            .getDescendantsOfKind(SyntaxKind.CallExpression)
            .filter((call) => callees.includes(call.getExpression().getText())).length;
    }

    private calculateComplexity(sourceFile: SourceFile): number {
        // Simple cyclomatic complexity calculation
        const controlFlow =
            sourceFile.getDescendantsOfKind(SyntaxKind.IfStatement).length +
            sourceFile.getDescendantsOfKind(SyntaxKind.WhileStatement).length +
            sourceFile.getDescendantsOfKind(SyntaxKind.ForStatement).length +
            sourceFile.getDescendantsOfKind(SyntaxKind.SwitchStatement).length;

        return controlFlow + 1; // Base complexity is 1
    }
}
