// SSR compile-mode emitter (FIRST SLICE): compiles Exodra JSX into a template
// string instead of an h() schema, so the static structure is baked and only the
// data-driven holes cost anything at render time. Output uses two runtime helpers
// from @exodra/string — `_a` (spaceAttribute) for attribute holes and `_esc`
// (escapeHtml) for text holes — so it emits byte-identical HTML to the walker.
//
// Covered so far: intrinsic elements, static + bindable attribute buckets, JSX
// text (baked), `{expr}` text holes, nested elements. NOT yet: components, lists
// (`{arr.map()}`), conditionals, fragments, textContent/children buckets,
// dangerouslySetInnerHTML. Those throw or are added in later slices.

import * as t from '@babel/types';
import { foldObject } from './style-transform';

// HTML void elements: no closing tag, no content. Must match the walker's table
// (@exodra/string) so compiled SSR emits byte-identical, valid HTML.
const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Per-file usage of runtime helpers, so the plugin only imports what is emitted:
// `_ctx` (component context) and `_style` (@exodra/style, for a dynamic `style`).
let usedCtx = false;
let usedStyle = false;

// Local names for the emitted runtime helpers. Default to the bare `_a`/`_esc`/…
// for readable output; the plugin overrides them with collision-free uids when the
// source file already binds one of those names (shadow-safety).
export interface SsrHelperNames {
    a: string;
    esc: string;
    html: string;
    ctx: string;
    style: string;
}
let H: SsrHelperNames = {
    a: '_a',
    esc: '_esc',
    html: '_html',
    ctx: '_ctx',
    style: '_style',
};
export function setSsrHelperNames(names: SsrHelperNames): void {
    H = names;
}
export function ssrHelperNames(): SsrHelperNames {
    return H;
}

export function resetSsrUsage(): void {
    usedCtx = false;
    usedStyle = false;
    H = { a: '_a', esc: '_esc', html: '_html', ctx: '_ctx', style: '_style' };
}
export function ssrUsedCtx(): boolean {
    return usedCtx;
}
export function ssrUsedStyle(): boolean {
    return usedStyle;
}

// Kept in sync with @exodra/string's escapeHtml — pinned by the ssr-emit parity
// test (same precedent as style-transform mirroring @exodra/style).
function escapeStatic(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

type Part = { str: string } | { expr: t.Expression };

// A component reference expression for a capitalized tag (`<Card/>` → `Card`) or
// a member tag (`<Foo.Bar/>` → `Foo.Bar`); null for an intrinsic (lowercase) tag.
// Matches the DOM plugin's getTagExpr, so both agree on what is a component.
function componentRef(
    name: t.JSXElement['openingElement']['name']
): t.Expression | null {
    if (t.isJSXIdentifier(name)) {
        const first = name.name[0];
        return first >= 'A' && first <= 'Z' ? t.identifier(name.name) : null;
    }
    if (t.isJSXMemberExpression(name)) return jsxMemberToExpr(name);
    return null;
}

function jsxMemberToExpr(m: t.JSXMemberExpression): t.Expression {
    const obj = t.isJSXMemberExpression(m.object)
        ? jsxMemberToExpr(m.object)
        : t.identifier((m.object as t.JSXIdentifier).name);
    return t.memberExpression(obj, t.identifier(m.property.name));
}

// The element tag as a literal string (intrinsic elements only).
function tagString(
    name: t.JSXElement['openingElement']['name']
): string {
    // In Exodra, a capitalized JSX tag compiles to `h("Name")` — a LITERAL element
    // named "Name", NOT a component call. (Composition is done with plain functions
    // returning schemas, invoked as `{fn(args)}`.) So every tag is a literal string.
    if (t.isJSXIdentifier(name)) return name.name;
    if (t.isJSXMemberExpression(name)) return memberToDotted(name);
    if (t.isJSXNamespacedName(name)) {
        return `${name.namespace.name}:${name.name.name}`;
    }
    throw new Error('ssr-emit: unsupported element tag');
}

function memberToDotted(m: t.JSXMemberExpression): string {
    const obj = t.isJSXMemberExpression(m.object)
        ? memberToDotted(m.object)
        : (m.object as t.JSXIdentifier).name;
    return `${obj}.${m.property.name}`;
}

function attrName(name: t.JSXAttribute['name']): string {
    if (t.isJSXIdentifier(name)) return name.name;
    if (t.isJSXNamespacedName(name)) return `${name.namespace.name}:${name.name.name}`;
    return '';
}

function objectProps(value: t.JSXAttribute['value']): t.ObjectProperty[] {
    if (
        value &&
        t.isJSXExpressionContainer(value) &&
        t.isObjectExpression(value.expression)
    ) {
        return value.expression.properties.filter(p =>
            t.isObjectProperty(p)
        ) as t.ObjectProperty[];
    }
    return [];
}

function propKey(prop: t.ObjectProperty): string {
    if (t.isIdentifier(prop.key)) return prop.key.name;
    if (t.isStringLiteral(prop.key)) return prop.key.value;
    throw new Error('ssr-emit: computed attribute keys are not supported in this slice');
}

const call = (fn: string, args: t.Expression[]): t.CallExpression =>
    t.callExpression(t.identifier(fn), args);

// `_a(name, valueExpr)` — attribute hole (leading-space form, empty when omitted).
const attrHole = (name: string, valueExpr: t.Expression): t.Expression =>
    call(H.a, [t.stringLiteral(name), valueExpr]);

// `_esc(expr)` — escaped text hole.
const escHole = (expr: t.Expression): t.Expression => call(H.esc, [expr]);

// Names that are NOT rendered as attributes (they drive content or lifecycle).
const NON_ATTR = new Set([
    'children',
    'textContent',
    'dangerouslySetInnerHTML',
    'onExoMount',
    'onExoUnmount',
]);

// Read `getValue()` off a signal expression.
const readSignal = (signal: t.Expression): t.Expression =>
    t.callExpression(t.memberExpression(signal, t.identifier('getValue')), []);

function isEventName(name: string): boolean {
    return /^on[A-Z]/.test(name) && !name.startsWith('onExo');
}

const NOT_LITERAL = Symbol('not-literal');

// The compile-time JS value of a literal node, or NOT_LITERAL when it is dynamic.
function literalValue(node: t.Expression): unknown {
    if (t.isStringLiteral(node)) return node.value;
    if (t.isNumericLiteral(node)) return node.value;
    if (t.isBooleanLiteral(node)) return node.value;
    if (t.isNullLiteral(node)) return null;
    if (t.isIdentifier(node, { name: 'undefined' })) return undefined;
    if (
        t.isUnaryExpression(node) &&
        node.operator === '-' &&
        t.isNumericLiteral(node.argument)
    ) {
        return -node.argument.value;
    }
    return NOT_LITERAL;
}

// Serialize one attribute to its exact bytes when the value is a literal — the
// same string @exodra/string's spaceAttribute produces at runtime (kept in sync;
// pinned by the ssr-emit parity tests), so static attrs are BAKED into the literal
// instead of costing a runtime `_a` call. Returns the leading-space attribute
// string, or null when the value is dynamic (fall back to `_a`).
function bakeStaticAttr(name: string, valueNode: t.Expression): string | null {
    const value = literalValue(valueNode);
    if (value === NOT_LITERAL) return null;
    if (
        NON_ATTR.has(name) ||
        isEventName(name) ||
        value === false ||
        value === null ||
        value === undefined
    ) {
        return '';
    }
    const attributeName = name === 'className' ? 'class' : name;
    if (value === true) return ` ${attributeName}`;
    return ` ${attributeName}="${escapeStatic(String(value))}"`;
}

// One static attribute → a baked string part (literal value) or a runtime `_a`
// hole (dynamic). A static `style` object folds to a CSS string (matching the DOM
// plugin); a dynamic one goes through @exodra/style's `style()` at runtime.
function staticAttrPart(name: string, value: t.Expression): Part {
    if (name === 'style' && t.isObjectExpression(value)) {
        const css = foldObject(value);
        if (css !== null) return { str: ` style="${escapeStatic(css)}"` };
        usedStyle = true;
        return {
            expr: attrHole('style', t.callExpression(t.identifier(H.style), [value])),
        };
    }
    const baked = bakeStaticAttr(name, value);
    return baked !== null ? { str: baked } : { expr: attrHole(name, value) };
}

function collect(node: t.JSXElement, parts: Part[]): void {
    const comp = componentRef(node.openingElement.name);
    if (comp) {
        emitComponentCall(node, comp, parts);
        return;
    }
    const tag = tagString(node.openingElement.name);
    parts.push({ str: `<${tag}` });

    // Split the buckets into attribute parts and the content-driving props. The
    // walker emits STATIC attrs before BINDABLE regardless of source order.
    const staticItems: Part[] = [];
    const bindableHoles: t.Expression[] = [];
    let staticTextContent: t.Expression | undefined;
    let bindableTextContent: t.Expression | undefined; // the signal
    let staticChildren: t.Expression | undefined;
    let bindableChildren: t.Expression | undefined; // the signal
    let dangerousHtml: t.Expression | undefined; // the __html value

    for (const attr of node.openingElement.attributes) {
        if (!t.isJSXAttribute(attr)) continue;
        const bucket = attrName(attr.name);
        if (bucket === 'static') {
            for (const p of objectProps(attr.value)) {
                const name = propKey(p);
                const value = p.value as t.Expression;
                if (name === 'textContent') staticTextContent = value;
                else if (name === 'children') staticChildren = value;
                else if (name === 'dangerouslySetInnerHTML') {
                    dangerousHtml = innerHtmlOf(value);
                } else if (!NON_ATTR.has(name)) {
                    staticItems.push(staticAttrPart(name, value));
                }
            }
        } else if (bucket === 'bindable') {
            for (const p of objectProps(attr.value)) {
                const name = propKey(p);
                const signal = p.value as t.Expression;
                if (name === 'textContent') bindableTextContent = signal;
                else if (name === 'children') bindableChildren = signal;
                else if (!NON_ATTR.has(name)) {
                    bindableHoles.push(attrHole(name, readSignal(signal)));
                }
            }
        } else if (bucket === 'handlers' || bucket === 'bindableHandlers') {
            continue; // event handlers do not render on the server
        } else {
            throw new Error(`ssr-emit: attribute bucket "${bucket}" is not supported in this slice`);
        }
    }
    for (const item of staticItems) parts.push(item);
    for (const hole of bindableHoles) parts.push({ expr: hole });

    parts.push({ str: '>' });

    // Void elements have no content and no closing tag (see VOID_ELEMENTS).
    if (VOID_ELEMENTS.has(tag)) return;

    // Content precedence mirrors the walker's renderElement:
    // dangerouslySetInnerHTML > textContent (bindable ?? static) > children.
    if (dangerousHtml) {
        parts.push({ expr: t.callExpression(t.identifier('String'), [dangerousHtml]) });
    } else if (bindableTextContent) {
        parts.push({ expr: escHole(readSignal(bindableTextContent)) });
    } else if (staticTextContent !== undefined) {
        // Bake a string-literal textContent; escape a dynamic one at runtime.
        if (t.isStringLiteral(staticTextContent)) {
            parts.push({ str: escapeStatic(staticTextContent.value) });
        } else {
            parts.push({ expr: escHole(staticTextContent) });
        }
    } else if (node.children.length > 0) {
        for (const child of node.children) collectChild(child, parts);
    } else if (bindableChildren) {
        parts.push({ expr: compileChildExpression(readSignal(bindableChildren)) });
    } else if (staticChildren) {
        parts.push({ expr: compileChildExpression(staticChildren) });
    }

    parts.push({ str: `</${tag}>` });
}

function hasRenderableChildren(node: t.JSXElement): boolean {
    return node.children.some(c => {
        if (t.isJSXText(c)) return c.value.trim().length > 0;
        if (t.isJSXExpressionContainer(c)) return !t.isJSXEmptyExpression(c.expression);
        return true;
    });
}

// A component usage `<Card static={{…}} bindable={{…}}/>` → `${Card(_ctx({…}))}`.
// The compiled component (a `(ctx) => string`) reads its props from the context,
// mirroring the walker. Children slots are not supported in this slice.
function emitComponentCall(
    node: t.JSXElement,
    comp: t.Expression,
    parts: Part[]
): void {
    const staticProps: t.ObjectProperty[] = [];
    const bindableProps: t.ObjectProperty[] = [];
    const bindableListProps: t.ObjectProperty[] = [];

    // Children pass to the component as SafeHtml under static.children — it renders
    // them if it reads `ctx.getConstant('children')`, mirroring the walker.
    if (hasRenderableChildren(node)) {
        const childParts: Part[] = [];
        for (const child of node.children) collectChild(child as JSXChild, childParts);
        staticProps.push(
            t.objectProperty(t.identifier('children'), markedTemplate(childParts))
        );
    }
    for (const attr of node.openingElement.attributes) {
        if (!t.isJSXAttribute(attr)) continue;
        const bucket = attrName(attr.name);
        if (bucket === 'static') staticProps.push(...objectProps(attr.value));
        else if (bucket === 'bindable') bindableProps.push(...objectProps(attr.value));
        else if (bucket === 'bindableList')
            bindableListProps.push(...objectProps(attr.value));
        else if (bucket === 'handlers' || bucket === 'bindableHandlers') continue;
        else {
            throw new Error(`ssr-emit: attribute bucket "${bucket}" is not supported in this slice`);
        }
    }
    const attrsObj: t.ObjectProperty[] = [];
    if (staticProps.length)
        attrsObj.push(
            t.objectProperty(t.identifier('static'), t.objectExpression(staticProps))
        );
    if (bindableProps.length)
        attrsObj.push(
            t.objectProperty(t.identifier('bindables'), t.objectExpression(bindableProps))
        );
    if (bindableListProps.length)
        attrsObj.push(
            t.objectProperty(
                t.identifier('bindableLists'),
                t.objectExpression(bindableListProps)
            )
        );

    usedCtx = true;
    const ctxCall = t.callExpression(t.identifier(H.ctx), [
        t.objectExpression(attrsObj),
    ]);
    parts.push({ expr: t.callExpression(comp, [ctxCall]) });
}

// Extract the `__html` value from a `{ __html: ... }` object literal.
function innerHtmlOf(value: t.Expression): t.Expression {
    if (t.isObjectExpression(value)) {
        for (const p of value.properties) {
            if (
                t.isObjectProperty(p) &&
                !p.computed &&
                ((t.isIdentifier(p.key) && p.key.name === '__html') ||
                    (t.isStringLiteral(p.key) && p.key.value === '__html'))
            ) {
                return p.value as t.Expression;
            }
        }
    }
    // Non-literal object: read `.__html` at runtime.
    return t.memberExpression(value, t.identifier('__html'));
}

type JSXChild =
    | t.JSXText
    | t.JSXExpressionContainer
    | t.JSXElement
    | t.JSXFragment
    | t.JSXSpreadChild;

function collectChild(child: JSXChild, parts: Part[]): void {
    if (t.isJSXText(child)) {
        const text = child.value.trim();
        if (text) parts.push({ str: escapeStatic(text) });
    } else if (t.isJSXExpressionContainer(child)) {
        if (!t.isJSXEmptyExpression(child.expression)) {
            parts.push({ expr: compileChildExpression(child.expression) });
        }
    } else if (t.isJSXElement(child)) {
        collect(child, parts);
    } else if (t.isJSXFragment(child)) {
        for (const c of child.children) collectChild(c as JSXChild, parts);
    } else {
        throw new Error('ssr-emit: unsupported child kind in this slice');
    }
}

// Lower a `{expr}` child to a STRING-producing expression, keeping the data-driven
// JS control flow but compiling any JSX in it to templates:
//   {arr.map(cb)}   → arr.map(compiledCb).join('')
//   {c && <x/>}     → c ? <x-template> : ''
//   {c ? a : b}     → c ? <compiled a> : <compiled b>
//   {<x/>}          → <x-template>   (raw HTML, not escaped)
//   {scalar}        → _esc(scalar)   (escaped text)
function compileChildExpression(expr: t.Expression): t.Expression {
    if (t.isJSXElement(expr)) return emitSsr(expr);
    if (t.isJSXFragment(expr)) return emitFragment(expr);

    // Falsy branches render nothing (the walker drops null/undefined/false).
    if (t.isNullLiteral(expr)) return t.stringLiteral('');
    if (t.isIdentifier(expr, { name: 'undefined' })) return t.stringLiteral('');
    if (t.isBooleanLiteral(expr, { value: false })) return t.stringLiteral('');

    if (t.isConditionalExpression(expr)) {
        return t.conditionalExpression(
            expr.test,
            compileChildExpression(expr.consequent),
            compileChildExpression(expr.alternate)
        );
    }

    if (t.isLogicalExpression(expr) && expr.operator === '&&') {
        return t.conditionalExpression(
            expr.left,
            compileChildExpression(expr.right),
            t.stringLiteral('')
        );
    }

    if (
        t.isCallExpression(expr) &&
        t.isMemberExpression(expr.callee) &&
        t.isIdentifier(expr.callee.property) &&
        (expr.callee.property.name === 'map' ||
            expr.callee.property.name === 'flatMap') &&
        expr.arguments.length >= 1
    ) {
        const cb = expr.arguments[0];
        // Inline callback: compile its JSX body. A reference (`arr.map(Card)`) is a
        // component/function compiled elsewhere; leave it — its SafeHtml results
        // flatten via toString on join(''). Either way, join to one string.
        const newCb =
            t.isArrowFunctionExpression(cb) || t.isFunctionExpression(cb)
                ? compileCallback(cb)
                : (cb as t.Expression);
        const mapped = t.callExpression(expr.callee, [
            newCb,
            ...(expr.arguments.slice(1) as t.Expression[]),
        ]);
        return t.callExpression(
            t.memberExpression(mapped, t.identifier('join')),
            [t.stringLiteral('')]
        );
    }

    // Scalar → escaped text hole.
    return escHole(expr);
}

// Compile a list callback's JSX body to a string-producing body.
function compileCallback(
    cb: t.ArrowFunctionExpression | t.FunctionExpression
): t.ArrowFunctionExpression | t.FunctionExpression {
    if (t.isArrowFunctionExpression(cb) && !t.isBlockStatement(cb.body)) {
        return t.arrowFunctionExpression(
            cb.params,
            compileChildExpression(cb.body as t.Expression)
        );
    }
    if (t.isBlockStatement(cb.body)) {
        const body = cb.body.body.map(stmt => {
            if (t.isReturnStatement(stmt) && stmt.argument) {
                return t.returnStatement(compileChildExpression(stmt.argument));
            }
            return stmt;
        });
        const block = t.blockStatement(body);
        return t.isArrowFunctionExpression(cb)
            ? t.arrowFunctionExpression(cb.params, block)
            : t.functionExpression(cb.id, cb.params, block);
    }
    throw new Error('ssr-emit: unsupported list callback shape in this slice');
}

// Wrap a built template as SafeHtml so it composes as raw HTML in a parent.
function markedTemplate(parts: Part[]): t.Expression {
    return t.callExpression(t.identifier(H.html), [buildTemplate(parts)]);
}

// A fragment: its children concatenated with no wrapper.
export function emitFragment(node: t.JSXFragment): t.Expression {
    const parts: Part[] = [];
    for (const child of node.children) collectChild(child as JSXChild, parts);
    return markedTemplate(parts);
}

function rawEscape(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function buildTemplate(parts: Part[]): t.TemplateLiteral {
    const quasis: t.TemplateElement[] = [];
    const expressions: t.Expression[] = [];
    let current = '';
    for (const p of parts) {
        if ('str' in p) {
            current += p.str;
        } else {
            quasis.push(
                t.templateElement({ raw: rawEscape(current), cooked: current }, false)
            );
            current = '';
            expressions.push(p.expr);
        }
    }
    quasis.push(t.templateElement({ raw: rawEscape(current), cooked: current }, true));
    return t.templateLiteral(quasis, expressions);
}

// Compile one Exodra JSX element to a SafeHtml template expression.
export function emitSsr(node: t.JSXElement): t.Expression {
    const parts: Part[] = [];
    collect(node, parts);
    return markedTemplate(parts);
}
