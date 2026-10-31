import {
    Project,
    SyntaxKind,
    type ArrowFunction,
    type FunctionDeclaration,
    type FunctionExpression,
    type Node,
    type SourceFile,
} from 'ts-morph';
import type {
    TExoEdgeEvidence,
    TExoGraphEdge,
    TExoGraphModel,
    TExoGraphNode,
    TExoMember,
    TExoMemberPart,
    TExoRelation,
    TExoUnresolvedType,
} from './types';
import { EXO_BOX_MEMBERS } from './boxLimits';

// What is INSIDE a package: its declarations, and how they reach each other. The output is the
// SAME model the package graph produces, so layout, view, theme and detail panel are all shared.
export type TExoEntityKind = 'class' | 'function' | 'type' | 'constant';

export type TExoExtractOptions = {
    // Files to read, e.g. `packages/dom/src/**/*.ts`.
    include: readonly string[];
    // Files to leave out. Tests by default: they reference everything, so including them turns the
    // diagram into a star around the test file.
    exclude?: readonly string[];
    // Only declarations reachable from the package's entry point(s).
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
export type TExoReferenceKind = 'calls' | 'extends' | 'implements' | 'constructs' | 'uses';

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
        if (excluded.some((pattern) => matches(path, pattern))) {
            project.removeSourceFile(file);
        }
    }

    // Filled by the one fenced call in this file; carried out in the model and counted by
    // the CLI. See `askTheChecker`.
    const unresolved: TExoUnresolvedType[] = [];
    const declarations = collectDeclarations(project.getSourceFiles(), unresolved);
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
                  .filter((declaration) => declaration.exported)
                  .map((declaration) => declaration.id)
          )
        : new Set(declarations.keys());

    // Names that exist in THIS diagram: only those are worth linking, since a
    // link to a box that is not on screen leads nowhere.
    const names = new Set(
        [...declarations.values()]
            .filter((declaration) => kept.has(declaration.id))
            .map((declaration) => declaration.id)
    );

    const nodes: TExoGraphNode[] = [...declarations.values()]
        .filter((declaration) => kept.has(declaration.id))
        .map((declaration) => {
            // EVERY member is kept, not just the ones that fit. The box draws
            // the first few and says how many it left out; the panel is where
            // the reader goes for the rest, and it cannot show what was thrown
            // away at build time.
            const members = declaration.members.map((member) => ({
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
            .filter((edge) => kept.has(edge.from) && kept.has(edge.to))
            .map(({ kindSet: _kindSet, ...edge }) => ({
                ...edge,
                kinds: [...new Set(edge.evidence.map((item) => item.kind))].sort(),
                // The reference kinds, kept where the detail panel can show them.
                evidence: edge.evidence,
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        rules: {},
        // Omitted when nothing was lost, so the key's presence is the signal.
        ...(unresolved.length > 0 ? { unresolved } : {}),
    };
}

/** The mark that goes where a type would have been. Deliberately not spellable as a type. */
export const EXO_UNRESOLVED_TYPE = '«type unresolved»';

// THE ONLY PLACE THIS EXTRACTOR HANDS ANYTHING TO THE TYPE CHECKER, and it is FENCED. Asking is
// not a lookup: it runs assignability, which has no fixed point on an interface whose method
// parameters mention the interface again — `@exodra/core`'s `TExoChildrenWiring`, six times
// over. A seen-set would guard nothing: the recursion is entirely inside the checker, below any
// frame this package owns. README, "The one call to the type checker, and why it is fenced".
export function askTheChecker(
    read: () => string,
    owner: string,
    member: string,
    into: TExoUnresolvedType[]
): string {
    try {
        return read();
    } catch (error) {
        // `String(error)` rather than a blind `.message`: a stack overflow is a real
        // `RangeError`, but a report that reads `undefined` for anything else is the
        // silence this whole guard exists to prevent.
        into.push({
            owner,
            member,
            reason: error instanceof Error ? error.message : String(error),
        });
        return EXO_UNRESOLVED_TYPE;
    }
}

// Entity kinds reuse the graph's three colour slots. Three is the cap for any node-link diagram
// (all-pairs separation), so `constant` shares the type slot rather than inventing a fourth hue.
// Splitting a member's text matches BY IDENTIFIER, the same way reference edges are found: the
// name in the signature IS what the reader sees, where the checker's expansion would disagree.
export function linkParts(text: string, known: ReadonlySet<string>): TExoMemberPart[] {
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
        height: (stereotype ? HEADER + 12 : HEADER) + lines * LINE + (lines > 0 ? 8 : 0),
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

// A member's source text without its comment: `getText()` on a documented field hands back the
// JSDoc too, which would put a paragraph inside a one-line box. The prose travels as `doc`.
function withoutComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** The same text, uncut — kept so a tooltip can show what the box could not. */
function fullType(text: string | undefined): string {
    return (text ?? '').replace(/\s+/g, ' ').trim();
}

// The author's own summary of a declaration, first sentence only — where JSDoc convention already
// puts the answer to "what is this". A `const` carries its JSDoc on the surrounding STATEMENT,
// not on the declaration, so that is where this looks.
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
    const jsDocable = node as { getJsDocs?: () => { getDescription: () => string }[] } | undefined;
    if (!jsDocable?.getJsDocs) return undefined;
    const docs = jsDocable
        .getJsDocs()
        .map((doc) => doc.getDescription())
        .join(' ');
    return docs || undefined;
}

// The run of `//` lines immediately above a declaration, as one paragraph. Only the LAST
// contiguous run, and only when TOUCHING the declaration: a comment separated by a blank line is
// commentary on the code before it, not documentation of what follows.
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

// A class's own methods and properties, in UML's order: fields, then methods. THE TYPE IS THE ONE
// THE AUTHOR WROTE wherever there is one, the checker being asked only where none was — the same
// rule `referencesFrom` and `typeMembers` follow, and what keeps this out of assignability.
function classMembers(declaration: Node, into: TExoUnresolvedType[]): TExoMember[] {
    if (!declaration.isKind(SyntaxKind.ClassDeclaration)) return [];
    const owner = declaration.getName() ?? '(anonymous class)';
    const fields: TExoMember[] = [];
    const methods: TExoMember[] = [];

    for (const property of declaration.getProperties()) {
        const name = property.getName();
        const type =
            written(property.getTypeNode()) ??
            askTheChecker(() => property.getType().getText(property), owner, name, into);
        fields.push({
            visibility: VISIBILITY[property.getScope()] ?? '+',
            modifier: property.isStatic() ? ('static' as const) : undefined,
            doc: docOf(property),
            text: `${name}: ${shortType(type)}`,
            full: `${name}: ${fullType(type)}`,
        });
    }
    for (const method of declaration.getMethods()) {
        const name = method.getName();
        const parameters = method
            .getParameters()
            .map((parameter) => parameter.getName())
            .join(', ');
        const returns =
            written(method.getReturnTypeNode()) ??
            askTheChecker(() => method.getReturnType().getText(method), owner, name, into);
        methods.push({
            visibility: VISIBILITY[method.getScope()] ?? '+',
            modifier: method.isStatic()
                ? ('static' as const)
                : method.isAbstract()
                ? ('abstract' as const)
                : undefined,
            doc: docOf(method),
            text: `${name}(${parameters}): ${shortType(returns, 18)}`,
            full: `${name}(${parameters}): ${fullType(returns)}`,
        });
    }
    return [...fields, ...methods];
}

/** A type annotation as the author spelled it, or nothing when they left it to inference. */
function written(typeNode: Node | undefined): string | undefined {
    if (!typeNode) return undefined;
    const text = withoutComments(typeNode.getText()).trim();
    return text || undefined;
}

/** An interface or object type alias, as its fields. */
function typeMembers(declaration: Node): TExoMember[] {
    if (declaration.isKind(SyntaxKind.InterfaceDeclaration)) {
        return declaration.getMembers().map((member) => ({
            visibility: '+' as const,
            text: shortType(withoutComments(member.getText()), 40),
            full: fullType(withoutComments(member.getText())),
            doc: docOf(member),
        }));
    }
    if (declaration.isKind(SyntaxKind.TypeAliasDeclaration)) {
        const literal = declaration.getTypeNode();
        if (literal?.isKind(SyntaxKind.TypeLiteral)) {
            return literal.getMembers().map((member) => ({
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

/** Whatever a reader would call a function: the declaration, or the arrow behind a `const`. */
type TExoFunctionNode = ArrowFunction | FunctionDeclaration | FunctionExpression;

// A function, as its signature. Read off the SIGNATURE NODE rather than
// `getType().getCallSignatures()`, for `classMembers`' reason: the declared return type is the
// answer whenever there is one. An unannotated function is still inferred, and that call is fenced.
function functionMember(declaration: Node, into: TExoUnresolvedType[]): TExoMember[] {
    const signature = signatureNodeOf(declaration);
    if (!signature) return [];

    const owner = ownerNameOf(declaration);
    const parameters = signature
        .getParameters()
        .map((parameter) => parameter.getName())
        .join(', ');
    const returns =
        written(signature.getReturnTypeNode()) ??
        askTheChecker(() => signature.getReturnType().getText(signature), owner, owner, into);
    return [
        {
            text: `(${parameters}): ${shortType(returns, 20)}`,
            full: `(${parameters}): ${fullType(returns)}`,
        },
    ];
}

/** What to call the thing in a report about it — the name the reader would use. */
function ownerNameOf(declaration: Node): string {
    if (declaration.isKind(SyntaxKind.VariableDeclaration)) return declaration.getName();
    if (declaration.isKind(SyntaxKind.FunctionDeclaration)) {
        return declaration.getName() ?? '(anonymous function)';
    }
    return '(anonymous function)';
}

/** The node that actually carries the parameters and the return type. */
function signatureNodeOf(declaration: Node): TExoFunctionNode | undefined {
    if (declaration.isKind(SyntaxKind.FunctionDeclaration)) return declaration;
    if (!declaration.isKind(SyntaxKind.VariableDeclaration)) return undefined;
    const initialiser = declaration.getInitializer();
    if (initialiser?.isKind(SyntaxKind.ArrowFunction)) return initialiser;
    if (initialiser?.isKind(SyntaxKind.FunctionExpression)) return initialiser;
    return undefined;
}

function collectDeclarations(
    files: readonly SourceFile[],
    into: TExoUnresolvedType[]
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
                        ? classMembers(node, into)
                        : kind === 'type'
                        ? typeMembers(node)
                        : kind === 'function'
                        ? functionMember(node, into)
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
            add(declaration.getName(), 'function', declaration, declaration.isExported());
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

// Every declaration this one reaches, resolved by IDENTIFIER and not by the type checker: for
// "who calls whom" the identifier is the honest answer, being what a reader sees.
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

    for (const identifier of declaration.node.getDescendantsOfKind(SyntaxKind.Identifier)) {
        const name = identifier.getText();
        if (!byId.has(name)) continue;

        const parent = identifier.getParent();

        // WHICH position the identifier sits in decides the relationship. An
        // identifier that is merely an ARGUMENT is not the thing being called:
        // `new Error(MESSAGE)` constructs Error, it does not construct MESSAGE.
        if (parent?.isKind(SyntaxKind.CallExpression) && parent.getExpression() === identifier) {
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
