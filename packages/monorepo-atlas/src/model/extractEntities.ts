import { Project, SyntaxKind, type Node, type SourceFile } from 'ts-morph';
import type {
    TExoEdgeEvidence,
    TExoGraphEdge,
    TExoGraphModel,
    TExoGraphNode,
    TExoMember,
    TExoMemberPart,
    TExoRelation,
} from './types';
import { EXO_BOX_MEMBERS } from './boxLimits';

/**
 * What is INSIDE a package: its declarations, and how they reach each other.
 *
 * This is the diagram people actually mean by "UML of the library" — classes,
 * functions and types, who calls whom, who extends whom. The package graph
 * answers "what does this package depend on"; this answers "how is it built".
 *
 * The output is the SAME model the package graph produces, so the layout, the
 * view, the theme and the detail panel are all shared — only the extraction
 * differs.
 */
export type TExoEntityKind =
    | 'class'
    | 'function'
    | 'type'
    | 'constant';

export type TExoExtractOptions = {
    /** Files to read, e.g. `packages/dom/src/**\/*.ts`. */
    include: readonly string[];
    /**
     * Files to leave out. Tests by default: they reference everything, so
     * including them turns the diagram into a star around the test file and
     * hides the structure it was drawn to show.
     */
    exclude?: readonly string[];
    /** Only declarations reachable from the package's entry point(s). */
    exportedOnly?: boolean;
    tsConfig?: string;
};

/** UML's notation for each kind of reference. */
const RELATION_BY_REFERENCE: Record<TExoReferenceKind, TExoRelation> = {
    extends: 'inheritance',
    implements: 'realization',
    constructs: 'composition',
    calls: 'association',
    uses: 'dependency',
};

/** How a reference reaches another declaration. */
export type TExoReferenceKind =
    | 'calls'
    | 'extends'
    | 'implements'
    | 'constructs'
    | 'uses';

export function extractEntities(options: TExoExtractOptions): TExoGraphModel {
    const project = new Project({
        tsConfigFilePath: options.tsConfig,
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
    });
    project.addSourceFilesAtPaths(options.include as string[]);
    const excluded = options.exclude ?? ['**/*.test.*', '**/*.spec.*', '**/*.d.ts'];
    for (const file of project.getSourceFiles()) {
        const path = file.getFilePath();
        if (excluded.some(pattern => matches(path, pattern))) {
            project.removeSourceFile(file);
        }
    }

    const declarations = collectDeclarations(project.getSourceFiles());
    const byNode = new Map<Node, TExoDeclaration>();
    for (const declaration of declarations.values()) {
        byNode.set(declaration.node, declaration);
    }

    const edges = new Map<string, TExoGraphEdge & { kindSet: Set<string> }>();
    for (const declaration of declarations.values()) {
        for (const reference of referencesFrom(declaration, byNode)) {
            const id = `${declaration.id}→${reference.to.id}`;
            const existing = edges.get(id);
            const evidence: TExoEdgeEvidence = {
                from: declaration.file,
                to: reference.to.file,
                specifier: reference.kind,
                // The model's own vocabulary: what survives to runtime. A type
                // reference is erased, everything else is real code.
                kind: reference.kind === 'uses' ? 'type-only' : 'value',
            };

            if (existing) {
                existing.kindSet.add(reference.kind);
                existing.weight += 1;
                (existing.evidence as TExoEdgeEvidence[]).push(evidence);
                continue;
            }
            edges.set(id, {
                id,
                from: declaration.id,
                to: reference.to.id,
                kindSet: new Set([reference.kind]),
                kinds: [],
                weight: 1,
                relation: RELATION_BY_REFERENCE[reference.kind],
                evidence: [evidence],
                violations: [],
            });
        }
    }

    const kept = options.exportedOnly
        ? new Set(
              [...declarations.values()]
                  .filter(declaration => declaration.exported)
                  .map(declaration => declaration.id)
          )
        : new Set(declarations.keys());

    // Names that exist in THIS diagram: only those are worth linking, since a
    // link to a box that is not on screen leads nowhere.
    const names = new Set(
        [...declarations.values()]
            .filter(declaration => kept.has(declaration.id))
            .map(declaration => declaration.id)
    );

    const nodes: TExoGraphNode[] = [...declarations.values()]
        .filter(declaration => kept.has(declaration.id))
        .map(declaration => {
            // EVERY member is kept, not just the ones that fit. The box draws
            // the first few and says how many it left out; the panel is where
            // the reader goes for the rest, and it cannot show what was thrown
            // away at build time.
            const members = declaration.members.map(member => ({
                ...member,
                parts: linkParts(member.text, names),
                // Names cut off by the box are still reachable from the card,
                // which shows the line whole.
                ...(member.full && member.full !== member.text
                    ? { fullParts: linkParts(member.full, names) }
                    : {}),
            }));
            return {
                id: declaration.id,
                label: declaration.name,
                kind: SLOT_BY_ENTITY[declaration.kind],
                layer: 0,
                members,
                memberCount: members.length,
                stereotype: declaration.stereotype,
                doc: declaration.doc,
                ...boxSize(
                    declaration.name,
                    declaration.stereotype,
                    members.slice(0, EXO_BOX_MEMBERS),
                    members.length > EXO_BOX_MEMBERS
                ),
                violations: [],
            };
        })
        .sort((a, b) => a.id.localeCompare(b.id));

    return {
        granularity: 'module',
        // The same three slots, a different meaning at this level.
        legend: { runtime: 'Class', tooling: 'Function', app: 'Type & constant' },
        nodes,
        edges: [...edges.values()]
            .filter(edge => kept.has(edge.from) && kept.has(edge.to))
            .map(({ kindSet: _kindSet, ...edge }) => ({
                ...edge,
                kinds: [...new Set(edge.evidence.map(item => item.kind))].sort(),
                // The reference kinds, kept where the detail panel can show them.
                evidence: edge.evidence,
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        rules: {},
    };
}

/**
 * Entity kinds reuse the graph's three colour slots. Three is the cap for any
 * node-link diagram (all-pairs separation), so `constant` shares the type slot
 * rather than inventing a fourth hue nobody can distinguish anyway.
 */
/**
 * Split a member's text so the entity names inside it can be followed.
 *
 * Matching is by identifier, the same way the reference edges are found — the
 * name in the signature IS what the reader sees, and resolving it through the
 * checker would disagree with the label on the box next to it.
 */
export function linkParts(
    text: string,
    known: ReadonlySet<string>
): TExoMemberPart[] {
    const parts: TExoMemberPart[] = [];
    let plain = '';
    // Identifiers only; punctuation and generics fall through as plain text.
    for (const token of text.split(/([A-Za-z_$][\w$]*)/)) {
        if (known.has(token)) {
            if (plain) parts.push({ text: plain });
            plain = '';
            parts.push({ text: token, link: token });
        } else {
            plain += token;
        }
    }
    if (plain) parts.push({ text: plain });
    return parts.length > 1 ? parts : [];
}

const CHAR = 6.4;
const HEADER = 34;
const LINE = 15;

/** Big enough for its longest line — a class box is sized by its contents. */
function boxSize(
    name: string,
    stereotype: string | undefined,
    shown: readonly TExoMember[],
    hasMore: boolean
): { width: number; height: number } {
    const longest = shown.reduce(
        (widest, member) => Math.max(widest, member.text.length + 2),
        Math.max(name.length, (stereotype?.length ?? 0) + 4)
    );
    const lines = shown.length + (hasMore ? 1 : 0);
    return {
        width: Math.max(120, Math.round(longest * CHAR) + 24),
        height:
            (stereotype ? HEADER + 12 : HEADER) +
            lines * LINE +
            (lines > 0 ? 8 : 0),
    };
}

const SLOT_BY_ENTITY: Record<TExoEntityKind, TExoGraphNode['kind']> = {
    class: 'runtime',
    function: 'tooling',
    type: 'app',
    constant: 'app',
};

/** Minimal glob matching: only the shapes the default exclusions use. */
function matches(path: string, pattern: string): boolean {
    // `**` is stashed as a placeholder while single `*` is expanded, then
    // restored — otherwise expanding `*` first would eat the second star.
    const DEEP = '\uE000';
    const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, DEEP)
        .replace(/\*/g, '[^/]*')
        .split(DEEP)
        .join('.*');
    return new RegExp(`^${escaped}$`).test(path);
}

type TExoDeclaration = {
    id: string;
    name: string;
    kind: TExoEntityKind;
    exported: boolean;
    file: string;
    node: Node;
    members: TExoMember[];
    stereotype?: string;
    doc?: string;
};

/** Trim a type to something that fits in a box without becoming a paragraph. */
function shortType(text: string | undefined, limit = 28): string {
    if (!text) return '';
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

/**
 * A member's source text without its comment. `getText()` on a documented field
 * hands back the JSDoc as well, which would put a paragraph inside a one-line
 * box — the prose is carried separately, as `doc`.
 */
function withoutComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** The same text, uncut — kept so a tooltip can show what the box could not. */
function fullType(text: string | undefined): string {
    return (text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * The author's own summary of a declaration.
 *
 * Only the first sentence: a box's tooltip and a side panel are not the place
 * to re-print a page of prose, and the first sentence is where JSDoc convention
 * already puts the answer to "what is this".
 *
 * A `const` carries its JSDoc on the surrounding statement, not on the
 * declaration — that is where the comment is written, so that is where it is
 * looked for.
 */
function docOf(node: Node): string | undefined {
    const docs =
        readDocs(node) ??
        (node.isKind(SyntaxKind.VariableDeclaration)
            ? readDocs(node.getVariableStatement() as Node | undefined)
            : undefined) ??
        // Plenty of real code documents a declaration with a block of `//`
        // lines above it rather than with `/** */`. To a reader that IS the
        // description, so refusing to read it would leave the diagram emptier
        // than the source for no reason a reader would accept.
        leadingLineComment(node) ??
        (node.isKind(SyntaxKind.VariableDeclaration)
            ? leadingLineComment(node.getVariableStatement() as Node | undefined)
            : undefined);
    if (!docs) return undefined;

    const text = docs.replace(/\s+/g, ' ').trim();
    if (!text) return undefined;
    const sentence = /^(.+?[.!?])(\s|$)/.exec(text);
    return shortDoc(sentence ? sentence[1] : text);
}

function readDocs(node: Node | undefined): string | undefined {
    const jsDocable = node as
        | { getJsDocs?: () => { getDescription: () => string }[] }
        | undefined;
    if (!jsDocable?.getJsDocs) return undefined;
    const docs = jsDocable
        .getJsDocs()
        .map(doc => doc.getDescription())
        .join(' ');
    return docs || undefined;
}

/**
 * The run of `//` lines immediately above a declaration, as one paragraph.
 *
 * Only the LAST contiguous run, and only when it is touching the declaration:
 * a comment separated by a blank line is commentary on the file or on the code
 * before it, not documentation of what follows.
 */
function leadingLineComment(node: Node | undefined): string | undefined {
    const ranges = node?.getLeadingCommentRanges() ?? [];
    const lines: string[] = [];
    for (const range of ranges) {
        const text = range.getText();
        if (!text.startsWith('//')) {
            lines.length = 0;
            continue;
        }
        lines.push(text.replace(/^\/\/\s?/, '').trim());
    }
    if (lines.length === 0) return undefined;

    const last = ranges[ranges.length - 1];
    const between = node?.getSourceFile().getFullText().slice(last.getEnd(), node.getStart());
    // A blank line between the comment and the code breaks the association.
    if ((between?.match(/\n/g)?.length ?? 0) > 1) return undefined;

    return lines.join(' ') || undefined;
}

/** Long enough to explain, short enough that a tooltip is still a tooltip. */
function shortDoc(text: string): string {
    return text.length > 240 ? `${text.slice(0, 239)}…` : text;
}

const VISIBILITY: Record<string, TExoMember['visibility']> = {
    private: '-',
    protected: '#',
    public: '+',
};

/** A class's own methods and properties, in UML's order: fields, then methods. */
function classMembers(declaration: Node): TExoMember[] {
    if (!declaration.isKind(SyntaxKind.ClassDeclaration)) return [];
    const fields: TExoMember[] = [];
    const methods: TExoMember[] = [];

    for (const property of declaration.getProperties()) {
        fields.push({
            visibility: VISIBILITY[property.getScope()] ?? '+',
            modifier: property.isStatic() ? ('static' as const) : undefined,
            doc: docOf(property),
            text: `${property.getName()}: ${shortType(property.getType().getText(property))}`,
            full: `${property.getName()}: ${fullType(property.getType().getText(property))}`,
        });
    }
    for (const method of declaration.getMethods()) {
        const parameters = method
            .getParameters()
            .map(parameter => parameter.getName())
            .join(', ');
        methods.push({
            visibility: VISIBILITY[method.getScope()] ?? '+',
            modifier: method.isStatic()
                ? ('static' as const)
                : method.isAbstract()
                  ? ('abstract' as const)
                  : undefined,
            doc: docOf(method),
            text: `${method.getName()}(${parameters}): ${shortType(
                method.getReturnType().getText(method),
                18
            )}`,
            full: `${method.getName()}(${parameters}): ${fullType(
                method.getReturnType().getText(method)
            )}`,
        });
    }
    return [...fields, ...methods];
}

/** An interface or object type alias, as its fields. */
function typeMembers(declaration: Node): TExoMember[] {
    if (declaration.isKind(SyntaxKind.InterfaceDeclaration)) {
        return declaration.getMembers().map(member => ({
            visibility: '+' as const,
            text: shortType(withoutComments(member.getText()), 40),
            full: fullType(withoutComments(member.getText())),
            doc: docOf(member),
        }));
    }
    if (declaration.isKind(SyntaxKind.TypeAliasDeclaration)) {
        const literal = declaration.getTypeNode();
        if (literal?.isKind(SyntaxKind.TypeLiteral)) {
            return literal.getMembers().map(member => ({
                visibility: '+' as const,
                text: shortType(withoutComments(member.getText()), 40),
                full: fullType(withoutComments(member.getText())),
                doc: docOf(member),
            }));
        }
        return [
            {
                text: shortType(literal?.getText(), 40),
                full: fullType(literal?.getText()),
            },
        ];
    }
    return [];
}

/** A function, as its signature — the only member it has. */
function functionMember(declaration: Node): TExoMember[] {
    if (
        !declaration.isKind(SyntaxKind.FunctionDeclaration) &&
        !declaration.isKind(SyntaxKind.VariableDeclaration)
    ) {
        return [];
    }
    const signature = declaration.getType().getCallSignatures()[0];
    if (!signature) return [];
    const parameters = signature
        .getParameters()
        .map(parameter => parameter.getName())
        .join(', ');
    const returns = signature.getReturnType().getText(declaration);
    return [
        {
            text: `(${parameters}): ${shortType(returns, 20)}`,
            full: `(${parameters}): ${fullType(returns)}`,
        },
    ];
}

function collectDeclarations(
    files: readonly SourceFile[]
): Map<string, TExoDeclaration> {
    const found = new Map<string, TExoDeclaration>();

    for (const file of files) {
        const path = file.getFilePath();
        const add = (
            name: string | undefined,
            kind: TExoEntityKind,
            node: Node,
            exported: boolean
        ): void => {
            if (!name) return;
            // Name-scoped, not path-scoped: two files declaring the same name is
            // rare in a package, and a path-based id makes every label unreadable.
            if (!found.has(name)) {
                const members =
                    kind === 'class'
                        ? classMembers(node)
                        : kind === 'type'
                          ? typeMembers(node)
                          : kind === 'function'
                            ? functionMember(node)
                            : [];
                found.set(name, {
                    id: name,
                    name,
                    kind,
                    exported,
                    file: path,
                    node,
                    members,
                    doc: docOf(node),
                    stereotype:
                        kind === 'class'
                            ? undefined
                            : kind === 'function'
                              ? 'function'
                              : kind === 'constant'
                                ? 'const'
                                : node.isKind(SyntaxKind.InterfaceDeclaration)
                                  ? 'interface'
                                  : 'type',
                });
            }
        };

        for (const declaration of file.getClasses()) {
            add(declaration.getName(), 'class', declaration, declaration.isExported());
        }
        for (const declaration of file.getFunctions()) {
            add(
                declaration.getName(),
                'function',
                declaration,
                declaration.isExported()
            );
        }
        for (const declaration of file.getInterfaces()) {
            add(declaration.getName(), 'type', declaration, declaration.isExported());
        }
        for (const declaration of file.getTypeAliases()) {
            add(declaration.getName(), 'type', declaration, declaration.isExported());
        }
        for (const statement of file.getVariableStatements()) {
            for (const declaration of statement.getDeclarations()) {
                // An arrow function assigned to a const is a function to a
                // reader, whatever the AST calls it.
                const initialiser = declaration.getInitializer();
                const isFunction =
                    initialiser?.isKind(SyntaxKind.ArrowFunction) ||
                    initialiser?.isKind(SyntaxKind.FunctionExpression);
                add(
                    declaration.getName(),
                    isFunction ? 'function' : 'constant',
                    declaration,
                    statement.isExported()
                );
            }
        }
    }

    return found;
}

/**
 * Every declaration this one reaches.
 *
 * Resolved by IDENTIFIER, not by the type checker: a full checker pass over a
 * whole package is slow, and for "who calls whom" the identifier is the honest
 * answer — it is what a reader sees.
 */
function referencesFrom(
    declaration: TExoDeclaration,
    byName: ReadonlyMap<Node, TExoDeclaration>
): Array<{ to: TExoDeclaration; kind: TExoReferenceKind }> {
    const byId = new Map<string, TExoDeclaration>();
    for (const known of byName.values()) byId.set(known.id, known);

    const out: Array<{ to: TExoDeclaration; kind: TExoReferenceKind }> = [];
    const seen = new Set<string>();

    const push = (name: string, kind: TExoReferenceKind): void => {
        const target = byId.get(name);
        if (!target || target.id === declaration.id) return;
        const key = `${target.id}:${kind}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ to: target, kind });
    };

    // Inheritance first: it is the strongest relationship a diagram can show.
    if (declaration.node.isKind(SyntaxKind.ClassDeclaration)) {
        const base = declaration.node.getExtends()?.getExpression().getText();
        if (base) push(base, 'extends');
        for (const implemented of declaration.node.getImplements()) {
            push(implemented.getExpression().getText(), 'implements');
        }
    }

    for (const identifier of declaration.node.getDescendantsOfKind(
        SyntaxKind.Identifier
    )) {
        const name = identifier.getText();
        if (!byId.has(name)) continue;

        const parent = identifier.getParent();

        // WHICH position the identifier sits in decides the relationship. An
        // identifier that is merely an ARGUMENT is not the thing being called:
        // `new Error(MESSAGE)` constructs Error, it does not construct MESSAGE.
        if (
            parent?.isKind(SyntaxKind.CallExpression) &&
            parent.getExpression() === identifier
        ) {
            push(name, 'calls');
        } else if (
            parent?.isKind(SyntaxKind.NewExpression) &&
            parent.getExpression() === identifier
        ) {
            push(name, 'constructs');
        } else if (
            parent?.isKind(SyntaxKind.TypeReference) ||
            parent?.isKind(SyntaxKind.ExpressionWithTypeArguments)
        ) {
            push(name, 'uses');
        } else if (
            parent?.isKind(SyntaxKind.PropertyAccessExpression) &&
            parent.getExpression() === identifier
        ) {
            // `thing.method()` — the reference is to `thing`.
            push(name, 'uses');
        } else {
            // Anything else — an argument, an initialiser, a property value —
            // is still a real reference, just not a call or an inheritance.
            push(name, 'uses');
        }
    }

    return out;
}
