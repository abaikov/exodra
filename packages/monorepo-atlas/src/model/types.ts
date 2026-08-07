/**
 * The domain of a project architecture graph.
 *
 * This is deliberately NOT "nodes and edges". A generic graph library gives you
 * those; what it cannot give you is the part that makes the picture worth
 * opening: which layer a package sits in, whether an edge is a real runtime
 * dependency or just a type import, whether package.json admits to it, which
 * rule it breaks and why — and, for any edge, the actual imports that produce
 * it. Those are the questions people open an architecture view to answer.
 *
 * The model is plain serialisable data with no renderer in it, because it is
 * built once at BUILD time, shipped as JSON, and server-rendered before any
 * script runs.
 */

/** Colour-carrying classification. Anything else renders neutral. */
export type TExoNodeKind = 'runtime' | 'tooling' | 'app' | 'other';

export type TExoRuleSeverity = 'error' | 'warn' | 'info';

/** A broken architecture rule, carrying the rule's own explanation. */
export type TExoViolation = {
    rule: string;
    severity: TExoRuleSeverity;
    /** Why the rule exists — written where the rule is defined. */
    comment?: string;
};

/**
 * How one thing reaches another. A dependency is not a single fact: the same
 * pair can be joined by a value import in one file and a type import in
 * another, and only the first survives to runtime.
 */
/**
 * The UML relationship an edge draws. Notation is not decoration: a hollow
 * triangle means "is a", an open arrow means "uses", and a reader who knows UML
 * reads the diagram without a legend.
 */
export type TExoRelation =
    | 'inheritance'
    | 'realization'
    | 'composition'
    | 'dependency'
    | 'association';

export type TExoEdgeKind =
    /** A real runtime import. */
    | 'value'
    /** Erased at compile time — architecturally much weaker. */
    | 'type-only'
    /** `import()` — a code-split boundary, not a load-time dependency. */
    | 'dynamic';

/** One import that justifies an edge — the answer to "why is this here?". */
export type TExoEdgeEvidence = {
    /** Module the import is written in. */
    from: string;
    /** Module it resolves to. */
    to: string;
    /** The specifier as authored, e.g. `@exodra/core`. */
    specifier: string;
    kind: TExoEdgeKind;
};

/** A run of a member's text; `link` names another entity in this diagram. */
export type TExoMemberPart = {
    text: string;
    link?: string;
};

/** One line in a class box: a method, a property, a signature. */
export type TExoMember = {
    text: string;
    /**
     * The same line, split so the type names in it can be followed. A member
     * that says `getReport(): TExoDomProfileEntry[]` is only half an answer if
     * the reader cannot get to TExoDomProfileEntry.
     */
    parts?: readonly TExoMemberPart[];
    /** The line before it was shortened to fit, for the tooltip. */
    full?: string;
    /**
     * The same split of the FULL line. A name that fell outside the box's own
     * truncation is still a name worth following once the reader is looking at
     * the whole signature.
     */
    fullParts?: readonly TExoMemberPart[];
    /**
     * What the author wrote about it. A signature says what goes in and what
     * comes out; only the prose says what the thing is FOR, and it is already
     * in the source — leaving it there means the diagram explains less than the
     * code it was drawn from.
     */
    doc?: string;
    /** `-` private, `#` protected, `+` public — UML's own marks. */
    visibility?: '+' | '-' | '#';
    /** UML underlines statics and italicises abstracts. */
    modifier?: TExoMemberModifier;
};

export type TExoMemberModifier = 'static' | 'abstract';

export type TExoGraphNode = {
    /** Package name, or module path at module granularity. */
    id: string;
    label: string;
    kind: TExoNodeKind;
    /**
     * Depth of the longest dependency chain BELOW this node, so zero means "it
     * depends on nothing else here". A layout can rank by this and the picture
     * reads bottom-up as the architecture actually stacks.
     */
    layer: number;
    /** Package granularity: how many modules it contains. */
    moduleCount?: number;
    /** Package granularity: does it go to npm? */
    published?: boolean;
    /**
     * What the box contains: a class's methods and properties, a function's
     * signature, an interface's fields. Without these a "class diagram" is just
     * a graph of names — the members are the half that says what the thing IS.
     */
    members?: readonly TExoMember[];
    /** «interface», «type», «const» — UML's guillemets. */
    stereotype?: string;
    /** The declaration's own JSDoc summary. */
    doc?: string;
    /** How many members exist, when the box could only draw the first few. */
    memberCount?: number;
    /** Size the layout must reserve, when the box carries members. */
    width?: number;
    height?: number;
    violations: readonly TExoViolation[];
};

export type TExoGraphEdge = {
    id: string;
    from: string;
    to: string;
    /** Every way this pair is joined, deduplicated. */
    kinds: readonly TExoEdgeKind[];
    /** How many underlying imports this edge stands for — its thickness. */
    weight: number;
    /** How to draw it. Absent on the package graph, where UML says nothing. */
    relation?: TExoRelation;
    evidence: readonly TExoEdgeEvidence[];
    /**
     * Package granularity: is the dependency in the importer's package.json?
     * `false` is the packaging bug that keeps happening — it works in a
     * monorepo and breaks for whoever installs the published package.
     */
    declared?: boolean;
    violations: readonly TExoViolation[];
};

export type TExoGraphModel = {
    granularity: 'package' | 'module';
    /**
     * What the three colours MEAN here. The same slots carry different
     * categories at different levels — packages are runtime/tooling/app, the
     * inside of a package is class/function/type — so the meaning travels with
     * the data instead of being assumed by the view.
     */
    legend?: Partial<Record<TExoNodeKind, string>>;
    nodes: readonly TExoGraphNode[];
    edges: readonly TExoGraphEdge[];
    /** Rule name → its severity and its reason, for the detail panel. */
    rules: Readonly<Record<string, { severity: TExoRuleSeverity; comment?: string }>>;
};

/** What the generator knows about a workspace package that the crawl does not. */
export type TExoPackageMeta = {
    /** Directory under packages/, e.g. `vite-plugin-exodra`. */
    dir: string;
    /** Published name, e.g. `@exodra/vite-plugin`. */
    name: string;
    published: boolean;
    kind: TExoNodeKind;
    /** Names this package declares in dependencies/peerDependencies. */
    declares: readonly string[];
};
