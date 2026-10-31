// Plain serialisable data with no renderer in it: built once at BUILD time, shipped as JSON, and
// server-rendered before any script runs.

// Colour-carrying classification. Anything else renders neutral.
export type TExoNodeKind = 'runtime' | 'tooling' | 'app' | 'other';

export type TExoRuleSeverity = 'error' | 'warn' | 'info';

export type TExoViolation = {
    rule: string;
    severity: TExoRuleSeverity;
    // Why the rule exists — written where the rule is defined.
    comment?: string;
};

// The UML relationship an edge draws: a hollow triangle means "is a", an open arrow means "uses",
// so a reader who knows UML reads the diagram without a legend.
export type TExoRelation =
    | 'inheritance'
    | 'realization'
    | 'composition'
    | 'dependency'
    | 'association';

export type TExoEdgeKind =
    // A real runtime import.
    | 'value'
    // Erased at compile time — architecturally much weaker.
    | 'type-only'
    // `import()` — a code-split boundary, not a load-time dependency.
    | 'dynamic';

// One import that justifies an edge — the answer to "why is this here?".
export type TExoEdgeEvidence = {
    // Module the import is written in.
    from: string;
    // Module it resolves to.
    to: string;
    // The specifier as authored, e.g. `@exodra/core`.
    specifier: string;
    kind: TExoEdgeKind;
};

// A run of a member's text; `link` names another entity in this diagram.
export type TExoMemberPart = {
    text: string;
    link?: string;
};

// One line in a class box: a method, a property, a signature.
export type TExoMember = {
    text: string;
    // The same line, split so the type names in it can be followed.
    parts?: readonly TExoMemberPart[];
    // The line before it was shortened to fit, for the tooltip.
    full?: string;
    // The same split of the FULL line, for names that fell outside the box's truncation.
    fullParts?: readonly TExoMemberPart[];
    // What the author wrote about it: the signature says what goes in and out, the prose what the
    // thing is FOR.
    doc?: string;
    // `-` private, `#` protected, `+` public — UML's own marks.
    visibility?: '+' | '-' | '#';
    // UML underlines statics and italicises abstracts.
    modifier?: TExoMemberModifier;
};

export type TExoMemberModifier = 'static' | 'abstract';

export type TExoGraphNode = {
    // Package name, or module path at module granularity.
    id: string;
    label: string;
    kind: TExoNodeKind;
    // Depth of the longest dependency chain BELOW this node, so zero means "depends on nothing
    // else here". A layout ranking by it reads bottom-up as the architecture stacks.
    layer: number;
    // Package granularity: how many modules it contains.
    moduleCount?: number;
    // Package granularity: does it go to npm?
    published?: boolean;
    // A class's methods and properties, a function's signature, an interface's fields.
    members?: readonly TExoMember[];
    // «interface», «type», «const» — UML's guillemets.
    stereotype?: string;
    // The declaration's own JSDoc summary.
    doc?: string;
    // How many members exist, when the box could only draw the first few.
    memberCount?: number;
    // Size the layout must reserve, when the box carries members.
    width?: number;
    height?: number;
    violations: readonly TExoViolation[];
};

export type TExoGraphEdge = {
    id: string;
    from: string;
    to: string;
    // Every way this pair is joined, deduplicated.
    kinds: readonly TExoEdgeKind[];
    // How many underlying imports this edge stands for — its thickness.
    weight: number;
    // How to draw it. Absent on the package graph, where UML says nothing.
    relation?: TExoRelation;
    evidence: readonly TExoEdgeEvidence[];
    // Package granularity: is the dependency in the importer's package.json? `false` works in a
    // monorepo and breaks for whoever installs the published package.
    declared?: boolean;
    violations: readonly TExoViolation[];
};

// A type this model does NOT carry. Every entry is also written into the member's own text as
// `«type unresolved»`, so the gap shows ON the picture, and the CLI prints the count.
export type TExoUnresolvedType = {
    // The declaration the member belongs to, e.g. `TExoTermNode`.
    owner: string;
    // Which member — the name is all that is left once the type is gone.
    member: string;
    // What the type checker did, in its own words.
    reason: string;
};

export type TExoGraphModel = {
    granularity: 'package' | 'module';
    // What the three colours MEAN here: the same slots carry different categories at different
    // levels, so the meaning travels with the data instead of being assumed by the view.
    legend?: Partial<Record<TExoNodeKind, string>>;
    nodes: readonly TExoGraphNode[];
    edges: readonly TExoGraphEdge[];
    // Rule name → its severity and its reason, for the detail panel.
    rules: Readonly<Record<string, { severity: TExoRuleSeverity; comment?: string }>>;
    // Every type the extractor could not obtain. ABSENT when nothing was lost, so its presence in
    // a committed file is itself the alarm.
    unresolved?: readonly TExoUnresolvedType[];
};

// What the generator knows about a workspace package that the crawl does not.
export type TExoPackageMeta = {
    // Directory under packages/, e.g. `vite-plugin-exodra`.
    dir: string;
    // Published name, e.g. `@exodra/vite-plugin`.
    name: string;
    published: boolean;
    kind: TExoNodeKind;
    // Names this package declares in dependencies/peerDependencies.
    declares: readonly string[];
};
