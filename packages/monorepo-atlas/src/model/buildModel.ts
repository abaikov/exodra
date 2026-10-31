import type {
    TExoEdgeEvidence,
    TExoEdgeKind,
    TExoGraphEdge,
    TExoGraphModel,
    TExoGraphNode,
    TExoPackageMeta,
    TExoRuleSeverity,
    TExoViolation,
} from './types';

/**
 * The slice of a dependency-cruiser result this builder reads. Declared
 * structurally rather than imported so the model stays a pure data transform
 * with no crawler dependency — and so a test can hand it a five-line fixture.
 */
export type TExoCruiseInput = {
    modules: ReadonlyArray<{
        source: string;
        dependencies?: ReadonlyArray<{
            module: string;
            resolved: string;
            dependencyTypes?: readonly string[];
            dynamic?: boolean;
            valid?: boolean;
            rules?: ReadonlyArray<{ name: string; severity: string }>;
        }>;
        valid?: boolean;
        rules?: ReadonlyArray<{ name: string; severity: string }>;
    }>;
    summary?: {
        ruleSetUsed?: {
            forbidden?: ReadonlyArray<{
                name: string;
                severity?: string;
                comment?: string;
            }>;
        };
    };
};

export type TExoBuildOptions = {
    granularity: 'package' | 'module';
    /** Workspace packages, keyed however the caller likes; matched by `dir`. */
    packages: readonly TExoPackageMeta[];
    /**
     * Modules to leave out of the ARCHITECTURE. Build configuration is the
     * default: `tsup.config.ts` importing `tsup` is a fact about how a package
     * is built, not about how the system is layered, and letting it in pushes
     * every package one layer up and drowns the real edges. The dependency
     * RULES still see those files — this only shapes the picture.
     */
    isPlumbing?: (source: string) => boolean;
};

const DEFAULT_PLUMBING = /(^|\/)[^/]*\.config\.[cm]?[jt]sx?$/;

export function buildModel(cruise: TExoCruiseInput, options: TExoBuildOptions): TExoGraphModel {
    const rules = collectRules(cruise);
    const byDir = new Map(options.packages.map((meta) => [meta.dir, meta]));
    const isPlumbing = options.isPlumbing ?? ((source: string) => DEFAULT_PLUMBING.test(source));
    const modules = cruise.modules.filter((module) => !isPlumbing(module.source));
    const kept: TExoCruiseInput = {
        ...cruise,
        modules: modules.map((module) => ({
            ...module,
            dependencies: (module.dependencies ?? []).filter(
                (dependency) => !isPlumbing(dependency.resolved)
            ),
        })),
    };

    // Longest-match lookup needs the directories; sorted so the search is
    // stable regardless of discovery order.
    const dirs = [...byDir.keys()].sort();

    return options.granularity === 'package'
        ? buildPackageModel(kept, byDir, dirs, rules)
        : buildModuleModel(kept, byDir, dirs, rules);
}

// ── shared ────────────────────────────────────────────────────────────────────

function collectRules(
    cruise: TExoCruiseInput
): Record<string, { severity: TExoRuleSeverity; comment?: string }> {
    const rules: Record<string, { severity: TExoRuleSeverity; comment?: string }> = {};
    for (const rule of cruise.summary?.ruleSetUsed?.forbidden ?? []) {
        rules[rule.name] = {
            severity: asSeverity(rule.severity),
            comment: rule.comment,
        };
    }
    return rules;
}

const asSeverity = (value: string | undefined): TExoRuleSeverity =>
    value === 'warn' || value === 'info' ? value : 'error';

/**
 * Which workspace package a file belongs to.
 *
 * Matched against the DISCOVERED package directories rather than parsed out of
 * the path: a repository is free to keep its packages anywhere (`packages/`,
 * `apps/`, `libs/`, the root itself), and nesting means the longest match is the
 * right one — `packages/group/inner/x.ts` belongs to `packages/group/inner`, not
 * to `packages/group`.
 */
export function packageDirOf(path: string, dirs: readonly string[]): string | undefined {
    let best: string | undefined;
    for (const dir of dirs) {
        if (dir === '.') {
            if (best === undefined) best = dir;
            continue;
        }
        if (path.startsWith(`${dir}/`) && (best === undefined || dir.length > best.length)) {
            best = dir;
        }
    }
    return best;
}

/** External packages keep their npm name so a graph can show what leaves the repo. */
export function externalNameOf(path: string): string | undefined {
    const scoped = /node_modules\/(@[^/]+\/[^/]+)/.exec(path);
    if (scoped) return scoped[1];
    const plain = /node_modules\/([^/@][^/]*)/.exec(path);
    return plain ? plain[1] : undefined;
}

/**
 * A dependency carries several type tags at once; what matters architecturally
 * is whether it survives to runtime.
 */
export function edgeKindOf(
    dependencyTypes: readonly string[] | undefined,
    dynamic: boolean | undefined
): TExoEdgeKind {
    if (dynamic || dependencyTypes?.includes('dynamic-import')) return 'dynamic';
    if (dependencyTypes?.includes('type-only')) return 'type-only';
    return 'value';
}

function violationsOf(
    rules: Record<string, { severity: TExoRuleSeverity; comment?: string }>,
    broken: ReadonlyArray<{ name: string; severity: string }> | undefined
): TExoViolation[] {
    return (broken ?? []).map((rule) => ({
        rule: rule.name,
        severity: asSeverity(rule.severity),
        comment: rules[rule.name]?.comment,
    }));
}

/**
 * Longest dependency chain below each node.
 *
 * Iterative with an explicit stack, and cycle-safe: a graph that should be
 * acyclic is not always acyclic — a cycle is exactly the kind of thing this tool
 * exists to show, so discovering one must not hang the build. Nodes on a cycle
 * simply stop contributing depth.
 */
export function computeLayers(
    ids: readonly string[],
    outgoing: ReadonlyMap<string, readonly string[]>
): Map<string, number> {
    const layer = new Map<string, number>();
    const state = new Map<string, 'visiting' | 'done'>();

    for (const start of ids) {
        if (state.get(start) === 'done') continue;
        const stack: Array<{ id: string; expanded: boolean }> = [{ id: start, expanded: false }];

        while (stack.length > 0) {
            const frame = stack[stack.length - 1];
            if (!frame.expanded) {
                if (state.get(frame.id) === 'done') {
                    stack.pop();
                    continue;
                }
                if (state.get(frame.id) === 'visiting') {
                    // Back-edge: a cycle. Treat it as contributing nothing.
                    stack.pop();
                    continue;
                }
                state.set(frame.id, 'visiting');
                frame.expanded = true;
                for (const next of outgoing.get(frame.id) ?? []) {
                    if (state.get(next) !== 'done') {
                        stack.push({ id: next, expanded: false });
                    }
                }
                continue;
            }

            let depth = 0;
            for (const next of outgoing.get(frame.id) ?? []) {
                const below = layer.get(next);
                if (below !== undefined) depth = Math.max(depth, below + 1);
            }
            layer.set(frame.id, depth);
            state.set(frame.id, 'done');
            stack.pop();
        }
    }

    return layer;
}

// ── package granularity ───────────────────────────────────────────────────────

function buildPackageModel(
    cruise: TExoCruiseInput,
    byDir: ReadonlyMap<string, TExoPackageMeta>,
    dirs: readonly string[],
    rules: Record<string, { severity: TExoRuleSeverity; comment?: string }>
): TExoGraphModel {
    const moduleCount = new Map<string, number>();
    const edges = new Map<string, TExoGraphEdge & { kindSet: Set<TExoEdgeKind> }>();
    const nodeViolations = new Map<string, TExoViolation[]>();

    for (const module of cruise.modules) {
        const fromDir = packageDirOf(module.source, dirs);
        // A path under packages/ that is not a KNOWN workspace package is not a
        // package: `packages/browser-tsup.mjs` is a loose build script, and a
        // path regex alone would draw it as a node.
        const fromMeta = fromDir ? byDir.get(fromDir) : undefined;
        if (!fromDir || !fromMeta) continue;
        moduleCount.set(fromDir, (moduleCount.get(fromDir) ?? 0) + 1);

        const fromId = fromMeta.name;

        for (const violation of violationsOf(rules, module.rules)) {
            push(nodeViolations, fromId, violation);
        }

        for (const dependency of module.dependencies ?? []) {
            const toDir = packageDirOf(dependency.resolved, dirs);
            const toId = toDir ? byDir.get(toDir)?.name : externalNameOf(dependency.resolved);
            // Node built-ins and unresolvable specifiers are not architecture.
            if (!toId || toId === fromId) continue;

            const id = `${fromId}→${toId}`;
            const kind = edgeKindOf(dependency.dependencyTypes, dependency.dynamic);
            const evidence: TExoEdgeEvidence = {
                from: module.source,
                to: dependency.resolved,
                specifier: dependency.module,
                kind,
            };

            const existing = edges.get(id);
            if (existing) {
                existing.kindSet.add(kind);
                existing.weight += 1;
                (existing.evidence as TExoEdgeEvidence[]).push(evidence);
                (existing.violations as TExoViolation[]).push(
                    ...violationsOf(rules, dependency.rules)
                );
                continue;
            }

            edges.set(id, {
                id,
                from: fromId,
                to: toId,
                kindSet: new Set([kind]),
                kinds: [],
                weight: 1,
                evidence: [evidence],
                declared: fromMeta.declares.includes(toId),
                violations: violationsOf(rules, dependency.rules),
            });
        }
    }

    const ids = new Set<string>();
    for (const dir of moduleCount.keys()) ids.add(byDir.get(dir)!.name);
    for (const edge of edges.values()) {
        ids.add(edge.from);
        ids.add(edge.to);
    }

    const outgoing = new Map<string, string[]>();
    for (const edge of edges.values()) {
        push(outgoing, edge.from, edge.to);
    }
    const layers = computeLayers([...ids], outgoing);

    const metaByName = new Map([...byDir.values()].map((meta) => [meta.name, meta] as const));
    const nodes: TExoGraphNode[] = [...ids].sort().map((id) => {
        const meta = metaByName.get(id);
        const dir = meta?.dir;
        return {
            id,
            label: id.replace(/^@[^/]+\//, ''),
            kind: meta?.kind ?? 'other',
            layer: layers.get(id) ?? 0,
            moduleCount: dir ? moduleCount.get(dir) : undefined,
            published: meta?.published,
            violations: nodeViolations.get(id) ?? [],
        };
    });

    return {
        granularity: 'package',
        legend: {
            runtime: 'Runtime',
            tooling: 'Build tooling',
            app: 'Apps & examples',
            other: 'From npm',
        },
        nodes,
        edges: [...edges.values()]
            .map(({ kindSet, ...edge }) => ({
                ...edge,
                kinds: [...kindSet].sort(),
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        rules,
    };
}

// ── module granularity ────────────────────────────────────────────────────────

function buildModuleModel(
    cruise: TExoCruiseInput,
    byDir: ReadonlyMap<string, TExoPackageMeta>,
    dirs: readonly string[],
    rules: Record<string, { severity: TExoRuleSeverity; comment?: string }>
): TExoGraphModel {
    const edges: TExoGraphEdge[] = [];
    const outgoing = new Map<string, string[]>();
    const sources = new Set(cruise.modules.map((module) => module.source));

    for (const module of cruise.modules) {
        for (const dependency of module.dependencies ?? []) {
            // Only edges INSIDE the crawl: a module-level view of node_modules
            // is noise, and those modules were never visited anyway.
            if (!sources.has(dependency.resolved)) continue;
            const kind = edgeKindOf(dependency.dependencyTypes, dependency.dynamic);
            edges.push({
                id: `${module.source}→${dependency.resolved}`,
                from: module.source,
                to: dependency.resolved,
                kinds: [kind],
                weight: 1,
                evidence: [
                    {
                        from: module.source,
                        to: dependency.resolved,
                        specifier: dependency.module,
                        kind,
                    },
                ],
                violations: violationsOf(rules, dependency.rules),
            });
            push(outgoing, module.source, dependency.resolved);
        }
    }

    const layers = computeLayers([...sources], outgoing);
    const nodes: TExoGraphNode[] = [...sources].sort().map((source) => {
        const dir = packageDirOf(source, dirs);
        const meta = dir ? byDir.get(dir) : undefined;
        const found = cruise.modules.find((module) => module.source === source);
        return {
            id: source,
            label: dir ? source.slice(dir.length + 1).replace(/^src\//, '') : source,
            kind: meta?.kind ?? 'other',
            layer: layers.get(source) ?? 0,
            violations: violationsOf(rules, found?.rules),
        };
    });

    return {
        granularity: 'module',
        legend: {
            runtime: 'Runtime',
            tooling: 'Build tooling',
            app: 'Apps & examples',
        },
        nodes,
        edges,
        rules,
    };
}

function push<TValue>(map: Map<string, TValue[]>, key: string, value: TValue): void {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
}

/**
 * Keep only the nodes a predicate accepts, dropping every edge that loses an
 * endpoint.
 *
 * Filtering the MODEL rather than hiding in the view matters for geometry: a
 * hidden node still occupies its slot in the layout, so a graph with half its
 * nodes hidden draws itself across a canvas of empty space. Measured on this
 * repo: 59 nodes span 5952px, the 28 own packages span 2163px.
 */
export function filterNodes(
    model: TExoGraphModel,
    keep: (node: TExoGraphNode) => boolean
): TExoGraphModel {
    const kept = new Set(model.nodes.filter(keep).map((node) => node.id));
    return {
        ...model,
        nodes: model.nodes.filter((node) => kept.has(node.id)),
        edges: model.edges.filter((edge) => kept.has(edge.from) && kept.has(edge.to)),
    };
}

/** The workspace's own packages, without what it pulls from npm. */
export function withoutExternal(model: TExoGraphModel): TExoGraphModel {
    return filterNodes(model, (node) => node.kind !== 'other');
}
