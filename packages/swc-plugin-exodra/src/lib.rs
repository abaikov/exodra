//! SWC plugin that compiles Exodra JSX into `h()` / `text()` calls — a Rust port
//! of `@exodra/babel-plugin-jsx` for SWC-based toolchains (Next.js default,
//! @swc/jest, swc-loader) that cannot run the Babel plugin.
//!
//! Ported so far (parity with the core of the Babel plugin):
//!   - intrinsic + component elements -> `h("tag" | Comp, { ...buckets })`
//!   - the five typed buckets: static / bindable(s) / bindableList(s) /
//!     handlers / bindableHandlers, plus `props={...}` spreads
//!   - children (nested elements, text -> `text("...")`, `{expr}`) into
//!     `static.children`
//!   - auto-import of `h` / `text` from the import source
//!   - STRICT: a flat attribute (e.g. `class`, `onClick`) is a hard error
//!
//! NOT yet ported (documented gaps — use the Babel pipeline if you need these):
//!   - `bind:` / `cache:` directives  - shadow-safe uid auto-imports
//!   - compile-time static hoisting     - fragment components / bindableList children

use std::collections::{HashMap, HashSet};
use swc_core::common::{Span, SyntaxContext, DUMMY_SP};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{visit_mut_pass, Visit, VisitMut, VisitMutWith, VisitWith};
use swc_core::plugin::errors::HANDLER;
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

const IMPORT_SOURCE: &str = "@exodra/core";

pub struct Exodra {
    used_h: bool,
    used_text: bool,
    used_fragment: bool,
    used_merge_attrs: bool,
    used_style: bool,
    // Which @exodra/forms bind* helpers were referenced (sorted for stable output).
    forms: std::collections::BTreeSet<&'static str>,
    // Names bound anywhere in the module (for shadow-safe auto-imports), and the
    // resolved local name for each helper (bare, or a uid when shadowed).
    bound: HashSet<String>,
    locals: HashMap<&'static str, String>,
}

// Collect every name bound anywhere in the module (params, decls, imports, catch)
// so a helper import can dodge a user binding of the same name.
struct BindingCollector {
    names: HashSet<String>,
}

impl Visit for BindingCollector {
    fn visit_binding_ident(&mut self, n: &BindingIdent) {
        self.names.insert(n.id.sym.to_string());
        n.visit_children_with(self);
    }
    fn visit_fn_decl(&mut self, n: &FnDecl) {
        self.names.insert(n.ident.sym.to_string());
        n.visit_children_with(self);
    }
    fn visit_class_decl(&mut self, n: &ClassDecl) {
        self.names.insert(n.ident.sym.to_string());
        n.visit_children_with(self);
    }
    fn visit_import_named_specifier(&mut self, n: &ImportNamedSpecifier) {
        self.names.insert(n.local.sym.to_string());
        n.visit_children_with(self);
    }
    fn visit_import_default_specifier(&mut self, n: &ImportDefaultSpecifier) {
        self.names.insert(n.local.sym.to_string());
        n.visit_children_with(self);
    }
    fn visit_import_star_as_specifier(&mut self, n: &ImportStarAsSpecifier) {
        self.names.insert(n.local.sym.to_string());
        n.visit_children_with(self);
    }
}

// ---- tiny AST builders ----------------------------------------------------

fn ident(sym: &str) -> Ident {
    Ident {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        sym: sym.into(),
        optional: false,
    }
}

fn ident_name(sym: &str) -> IdentName {
    IdentName {
        span: DUMMY_SP,
        sym: sym.into(),
    }
}

fn str_lit(s: &str) -> Expr {
    Expr::Lit(Lit::Str(Str {
        span: DUMMY_SP,
        value: s.into(),
        raw: None,
    }))
}

fn call(callee: Expr, args: Vec<Expr>) -> Expr {
    Expr::Call(CallExpr {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        callee: Callee::Expr(Box::new(callee)),
        args: args
            .into_iter()
            .map(|e| ExprOrSpread {
                spread: None,
                expr: Box::new(e),
            })
            .collect(),
        type_args: None,
    })
}

fn key_value(key: &str, value: Expr) -> PropOrSpread {
    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
        key: PropName::Ident(ident_name(key)),
        value: Box::new(value),
    })))
}

fn object(props: Vec<PropOrSpread>) -> Expr {
    Expr::Object(ObjectLit {
        span: DUMMY_SP,
        props,
    })
}

fn array(items: Vec<Expr>) -> Expr {
    Expr::Array(ArrayLit {
        span: DUMMY_SP,
        elems: items
            .into_iter()
            .map(|e| {
                Some(ExprOrSpread {
                    spread: None,
                    expr: Box::new(e),
                })
            })
            .collect(),
    })
}

fn jsx_name_to_string(name: &JSXElementName) -> String {
    match name {
        JSXElementName::Ident(i) => i.sym.to_string(),
        JSXElementName::JSXMemberExpr(m) => format!("{}.{}", jsx_obj_to_string(&m.obj), m.prop.sym),
        JSXElementName::JSXNamespacedName(n) => format!("{}:{}", n.ns.sym, n.name.sym),
    }
}

fn jsx_obj_to_string(obj: &JSXObject) -> String {
    match obj {
        JSXObject::Ident(i) => i.sym.to_string(),
        JSXObject::JSXMemberExpr(m) => format!("{}.{}", jsx_obj_to_string(&m.obj), m.prop.sym),
    }
}

// `<Foo.Bar/>` component tag -> the member expression `Foo.Bar`.
fn jsx_member_to_expr(m: &JSXMemberExpr) -> Expr {
    let obj = match &m.obj {
        JSXObject::Ident(i) => Expr::Ident(i.clone()),
        JSXObject::JSXMemberExpr(inner) => jsx_member_to_expr(inner),
    };
    Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(obj),
        prop: MemberProp::Ident(m.prop.clone()),
    })
}

fn attr_name(name: &JSXAttrName) -> String {
    match name {
        JSXAttrName::Ident(i) => i.sym.to_string(),
        JSXAttrName::JSXNamespacedName(n) => format!("{}:{}", n.ns.sym, n.name.sym),
    }
}

// Pull the `{...}` object out of a bucket attribute's value.
fn attr_object_props(value: &Option<JSXAttrValue>) -> Option<Vec<PropOrSpread>> {
    if let Some(JSXAttrValue::JSXExprContainer(c)) = value {
        if let JSXExpr::Expr(e) = &c.expr {
            if let Expr::Object(o) = &**e {
                return Some(o.props.clone());
            }
        }
    }
    None
}

fn attr_expr(value: &Option<JSXAttrValue>) -> Option<Expr> {
    if let Some(JSXAttrValue::JSXExprContainer(c)) = value {
        if let JSXExpr::Expr(e) = &c.expr {
            return Some((**e).clone());
        }
    }
    None
}

// Find a static string prop by key (e.g. `type`) inside a `static` bucket.
fn static_string_prop(props: &[PropOrSpread], name: &str) -> Option<String> {
    for p in props {
        if let PropOrSpread::Prop(prop) = p {
            if let Prop::KeyValue(kv) = &**prop {
                let key = match &kv.key {
                    PropName::Ident(i) => i.sym.to_string(),
                    PropName::Str(s) => match s.value.as_str() {
                        Some(v) => v.to_string(),
                        None => continue,
                    },
                    _ => continue,
                };
                if key == name {
                    if let Expr::Lit(Lit::Str(s)) = &*kv.value {
                        return s.value.as_str().map(|v| v.to_string());
                    }
                }
            }
        }
    }
    None
}

// Pick the runtime bind helper at compile time (matches @exodra/babel-plugin-jsx).
fn bind_helper_name(tag: &str, target: &str, static_props: &[PropOrSpread]) -> &'static str {
    if target == "checked" {
        return "bindChecked";
    }
    if tag == "select" {
        return "bindSelect";
    }
    if tag == "textarea" {
        return "bindText";
    }
    match static_string_prop(static_props, "type").as_deref() {
        Some("number") | Some("range") => "bindNumber",
        Some("checkbox") | Some("radio") => "bindChecked",
        _ => "bindText",
    }
}

impl Exodra {
    // Resolve a helper's local name: the bare name, or a collision-free uid when
    // the module already binds that name (so a local `text`/`h` can't shadow it).
    fn local(&mut self, name: &'static str) -> String {
        if let Some(l) = self.locals.get(name) {
            return l.clone();
        }
        let local = if self.bound.contains(name) {
            let mut candidate = format!("_{}", name);
            let mut i = 2;
            while self.bound.contains(&candidate)
                || self.locals.values().any(|v| v == &candidate)
            {
                candidate = format!("_{}{}", name, i);
                i += 1;
            }
            candidate
        } else {
            name.to_string()
        };
        self.locals.insert(name, local.clone());
        local
    }

    fn h(&mut self) -> Expr {
        self.used_h = true;
        let name = self.local("h");
        Expr::Ident(ident(&name))
    }

    // Fold a `static` bucket property: a static `style` object → CSS string, a
    // dynamic one → `style(obj)` (from @exodra/style). Everything else passes
    // through unchanged.
    fn transform_static_style_prop(&mut self, p: PropOrSpread) -> PropOrSpread {
        if let PropOrSpread::Prop(prop) = &p {
            if let Prop::KeyValue(kv) = &**prop {
                if static_key(&kv.key).as_deref() == Some("style") {
                    if let Expr::Object(obj) = &*kv.value {
                        if let Some(css) = fold_object(obj) {
                            return key_value_prop(kv.key.clone(), str_lit(&css));
                        }
                        self.used_style = true;
                        let local = self.local("style");
                        let wrapped =
                            call(Expr::Ident(ident(&local)), vec![Expr::Object(obj.clone())]);
                        return key_value_prop(kv.key.clone(), wrapped);
                    }
                }
            }
        }
        p
    }

    fn transform_element(&mut self, el: &mut JSXElement) -> Expr {
        let tag = jsx_name_to_string(&el.opening.name);
        // A capitalized tag (`<Card/>` -> `h(Card, ..)`) or a member tag
        // (`<Foo.Bar/>` -> `h(Foo.Bar, ..)`) is a COMPONENT reference; an intrinsic
        // (lowercase) tag is a string. This lets JSX invoke components — matching
        // @exodra/babel-plugin-jsx's getTagExpr. Components are never static-hoisted
        // (the lowercase-tag-literal check already excludes non-string type args).
        let is_component = matches!(&el.opening.name, JSXElementName::JSXMemberExpr(_))
            || tag.chars().next().map(|c| c.is_uppercase()).unwrap_or(false);
        let tag_arg = if is_component {
            match &el.opening.name {
                JSXElementName::Ident(i) => Expr::Ident(i.clone()),
                JSXElementName::JSXMemberExpr(m) => jsx_member_to_expr(m),
                _ => str_lit(&tag),
            }
        } else {
            str_lit(&tag)
        };

        let mut static_props: Vec<PropOrSpread> = vec![];
        let mut bindables: Vec<PropOrSpread> = vec![];
        let mut bindable_lists: Vec<PropOrSpread> = vec![];
        let mut handlers: Vec<PropOrSpread> = vec![];
        let mut bindable_handlers: Vec<PropOrSpread> = vec![];
        let mut spreads: Vec<PropOrSpread> = vec![];
        // Two-way binding directives (`bind:value`/`bind:checked`) and the clone-
        // cache key (`cacheKey`/`cache:key`).
        let mut binds: Vec<(String, Expr)> = vec![];
        let mut cache_key: Option<Expr> = None;

        for attr in el.opening.attrs.iter_mut() {
            let a = match attr {
                JSXAttrOrSpread::JSXAttr(a) => a,
                // Spread attributes are ignored (use props={} / exo:schema).
                JSXAttrOrSpread::SpreadElement(_) => continue,
            };
            let name = attr_name(&a.name);
            match name.as_str() {
                "static" => {
                    if let Some(props) = attr_object_props(&a.value) {
                        for p in props {
                            static_props.push(self.transform_static_style_prop(p));
                        }
                    }
                }
                "bindable" => push_bucket(&mut a.value, &mut bindables),
                "bindableList" => push_bucket(&mut a.value, &mut bindable_lists),
                "handler" | "handlers" => push_bucket(&mut a.value, &mut handlers),
                "bindableHandler" | "bindableHandlers" => {
                    push_bucket(&mut a.value, &mut bindable_handlers)
                }
                "props" => {
                    if let Some(mut e) = attr_expr(&a.value) {
                        e.visit_mut_with(self);
                        spreads.push(PropOrSpread::Spread(SpreadElement {
                            dot3_token: DUMMY_SP,
                            expr: Box::new(e),
                        }));
                    }
                }
                "cacheKey" | "cache:key" => {
                    if let Some(mut e) = attr_expr(&a.value) {
                        e.visit_mut_with(self);
                        cache_key = Some(e);
                    }
                }
                other if other.starts_with("bind:") => {
                    let target = other["bind:".len()..].to_string();
                    let mut value = attr_expr(&a.value).unwrap_or(Expr::Lit(Lit::Null(Null {
                        span: DUMMY_SP,
                    })));
                    value.visit_mut_with(self);
                    binds.push((target, value));
                }
                other if other.starts_with("on") && other[2..].starts_with(|c: char| c.is_uppercase()) => {
                    emit_err(
                        a.span,
                        format!(
                            "Exodra JSX: flat event prop \"{}\" is not allowed. Use handlers={{ {}: ... }}.",
                            other, other
                        ),
                    );
                }
                other => {
                    emit_err(
                        a.span,
                        format!(
                            "Exodra JSX: flat attribute \"{}\" is not allowed. Put it in a bucket — \
                             static={{ \"{}\": ... }} for a plain attribute, bindable={{ {}: signal }} \
                             for a reactive one.",
                            other, other, other
                        ),
                    );
                }
            }
        }

        // Transform any nested JSX inside the bucket objects we collected.
        for p in static_props
            .iter_mut()
            .chain(bindables.iter_mut())
            .chain(bindable_lists.iter_mut())
            .chain(handlers.iter_mut())
            .chain(bindable_handlers.iter_mut())
        {
            p.visit_mut_with(self);
        }

        // Children go into static.children (single child unwrapped, else an array).
        if let Some(children) = self.transform_children(&mut el.children) {
            static_props.push(key_value("children", children));
        }

        // Build directive calls (bind:*) BEFORE consuming static_props — the helper
        // is chosen from the element's `type`/tag.
        let directive_calls: Vec<Expr> = binds
            .into_iter()
            .map(|(target, value)| {
                let helper = bind_helper_name(&tag, &target, &static_props);
                self.forms.insert(helper);
                let local = self.local(helper);
                call(Expr::Ident(ident(&local)), vec![value])
            })
            .collect();

        let mut members: Vec<PropOrSpread> = vec![];
        members.append(&mut spreads);
        if !static_props.is_empty() {
            members.push(key_value("static", object(static_props)));
        }
        if !bindables.is_empty() {
            members.push(key_value("bindables", object(bindables)));
        }
        if !bindable_lists.is_empty() {
            members.push(key_value("bindableLists", object(bindable_lists)));
        }
        if !handlers.is_empty() {
            members.push(key_value("handlers", object(handlers)));
        }
        if !bindable_handlers.is_empty() {
            members.push(key_value("bindableHandlers", object(bindable_handlers)));
        }

        // Second argument: bare object, or mergeAttrs(base, ...directiveCalls) when
        // there are bind: directives. `None` only when nothing to pass.
        let members_empty = members.is_empty();
        let second: Option<Expr> = if !directive_calls.is_empty() {
            self.used_merge_attrs = true;
            let merge = self.local("mergeAttrs");
            let mut args = vec![object(members)];
            args.extend(directive_calls);
            Some(call(Expr::Ident(ident(&merge)), args))
        } else if members_empty {
            None
        } else {
            Some(object(members))
        };

        let h = self.h();
        let mut args = vec![tag_arg];
        if let Some(ck) = cache_key {
            // h(tag, attrs, cacheKey) — ensure the attrs slot exists for the 3rd arg.
            args.push(second.unwrap_or_else(|| object(vec![])));
            args.push(ck);
        } else if let Some(s) = second {
            args.push(s);
        }
        call(h, args)
    }

    fn transform_fragment(&mut self, frag: &mut JSXFragment) -> Expr {
        match self.transform_children(&mut frag.children) {
            None => array(vec![]),
            // A single identifier child is a reactive list: h(Fragment, {
            // bindableLists: { children: <ident> } }). Fragment from @exodra/jsx.
            Some(Expr::Ident(id)) => {
                self.used_fragment = true;
                let frag = self.local("Fragment");
                let h = self.h();
                call(
                    h,
                    vec![
                        Expr::Ident(ident(&frag)),
                        object(vec![key_value(
                            "bindableLists",
                            object(vec![key_value("children", Expr::Ident(id))]),
                        )]),
                    ],
                )
            }
            Some(e) => e,
        }
    }

    fn transform_children(&mut self, children: &mut [JSXElementChild]) -> Option<Expr> {
        let mut out: Vec<Expr> = vec![];
        for child in children.iter_mut() {
            match child {
                JSXElementChild::JSXElement(el) => out.push(self.transform_element(el)),
                JSXElementChild::JSXFragment(f) => {
                    let frag = self.transform_fragment(f);
                    // Static fragment -> splice its array of children into the parent.
                    if let Expr::Array(a) = frag {
                        for el in a.elems.into_iter().flatten() {
                            out.push(*el.expr);
                        }
                    } else {
                        out.push(frag);
                    }
                }
                JSXElementChild::JSXText(t) => {
                    // Preserve significant (same-line) whitespace between text and
                    // expressions; only trim what sits next to a newline (JSX
                    // rules). Matches @exodra/babel-plugin-jsx's cleanJSXText.
                    let cleaned = clean_jsx_text(&t.value);
                    if !cleaned.is_empty() {
                        self.used_text = true;
                        let name = self.local("text");
                        out.push(call(Expr::Ident(ident(&name)), vec![str_lit(&cleaned)]));
                    }
                }
                JSXElementChild::JSXExprContainer(c) => {
                    if let JSXExpr::Expr(e) = &mut c.expr {
                        e.visit_mut_with(self);
                        out.push((**e).clone());
                    }
                }
                JSXElementChild::JSXSpreadChild(_) => {}
            }
        }
        match out.len() {
            0 => None,
            1 => Some(out.into_iter().next().unwrap()),
            _ => Some(array(out)),
        }
    }
}

// Clean a JSXText value per the JSX whitespace rules (identical to React / Babel
// and to @exodra/babel-plugin-jsx's cleanJSXText): whitespace adjacent to a
// newline is trimmed and whitespace-only lines are dropped, but a same-line space
// between text and an expression is SIGNIFICANT and preserved — so `Total {t}: {n}`
// keeps its spaces instead of collapsing to `Totalt:n`.
fn clean_jsx_text(raw: &str) -> String {
    let normalized = raw.replace("\r\n", "\n").replace('\r', "\n");
    let lines: Vec<&str> = normalized.split('\n').collect();
    let n = lines.len();
    // Default 0 (like Babel): a whitespace-only single line stays one space.
    let mut last_non_empty = 0usize;
    for (i, line) in lines.iter().enumerate() {
        if line.chars().any(|c| c != ' ' && c != '\t') {
            last_non_empty = i;
        }
    }
    let mut out = String::new();
    for (i, line) in lines.iter().enumerate() {
        let mut s = line.replace('\t', " ");
        if i != 0 {
            s = s.trim_start_matches(' ').to_string();
        }
        if i != n - 1 {
            s = s.trim_end_matches(' ').to_string();
        }
        if s.is_empty() {
            continue;
        }
        if i != last_non_empty {
            s.push(' ');
        }
        out.push_str(&s);
    }
    out
}

// Emit a user-facing compile error through SWC's diagnostic handler, so the
// message reaches the caller (a plugin `panic!` only shows a generic
// "failed to run Wasm plugin" to the host).
fn emit_err(span: Span, msg: String) {
    HANDLER.with(|handler| handler.struct_span_err(span, &msg).emit());
}

// ---- static `style` folding -----------------------------------------------
//
// A `static.style` object literal is folded to a CSS string at build time when
// every value is a static literal (zero runtime, then hoistable). A dynamic value
// makes it `style(obj)` at runtime. Rules stay byte-for-byte identical to
// @exodra/style (mirrors @exodra/babel-plugin-jsx's style-transform).

const UNITLESS: &[&str] = &[
    "animationIterationCount",
    "aspectRatio",
    "columnCount",
    "columns",
    "flex",
    "flexGrow",
    "flexShrink",
    "fontWeight",
    "gridArea",
    "gridColumn",
    "gridColumnEnd",
    "gridColumnStart",
    "gridRow",
    "gridRowEnd",
    "gridRowStart",
    "lineHeight",
    "opacity",
    "order",
    "orphans",
    "tabSize",
    "widows",
    "zIndex",
    "zoom",
    "fillOpacity",
    "floodOpacity",
    "stopOpacity",
    "strokeOpacity",
];

fn to_kebab(key: &str) -> String {
    if key.starts_with("--") || key.contains('-') {
        return key.to_string();
    }
    let mut kebab = String::new();
    for c in key.chars() {
        if c.is_ascii_uppercase() {
            kebab.push('-');
            kebab.push(c.to_ascii_lowercase());
        } else {
            kebab.push(c);
        }
    }
    if kebab.starts_with("ms-") {
        format!("-{}", kebab)
    } else {
        kebab
    }
}

fn is_unitless(key: &str) -> bool {
    let camel = if key.contains('-') {
        let mut s = String::new();
        let mut chars = key.chars().peekable();
        while let Some(c) = chars.next() {
            if c == '-' {
                if let Some(&next) = chars.peek() {
                    if next.is_ascii_lowercase() {
                        s.push(next.to_ascii_uppercase());
                        chars.next();
                        continue;
                    }
                }
            }
            s.push(c);
        }
        s
    } else {
        key.to_string()
    };
    UNITLESS.contains(&camel.as_str())
}

fn static_key(key: &PropName) -> Option<String> {
    match key {
        PropName::Ident(i) => Some(i.sym.to_string()),
        PropName::Str(s) => s.value.as_str().map(|v| v.to_string()),
        _ => None,
    }
}

enum Scalar {
    Str(String),
    Num(f64),
    Drop,
    Dynamic,
}

fn static_scalar(node: &Expr) -> Scalar {
    match node {
        Expr::Lit(Lit::Str(s)) => match s.value.as_str() {
            Some(v) => Scalar::Str(v.to_string()),
            None => Scalar::Dynamic,
        },
        Expr::Lit(Lit::Num(n)) => Scalar::Num(n.value),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Minus) => match &*u.arg {
            Expr::Lit(Lit::Num(n)) => Scalar::Num(-n.value),
            _ => Scalar::Dynamic,
        },
        Expr::Lit(Lit::Null(_)) => Scalar::Drop,
        Expr::Ident(i) if i.sym.as_ref() == "undefined" => Scalar::Drop,
        Expr::Lit(Lit::Bool(b)) if !b.value => Scalar::Drop,
        _ => Scalar::Dynamic,
    }
}

fn format_value(key: &str, scalar: &Scalar) -> String {
    match scalar {
        Scalar::Num(n) => {
            if *n != 0.0 && !key.starts_with("--") && !is_unitless(key) {
                format!("{}px", n)
            } else {
                format!("{}", n)
            }
        }
        Scalar::Str(s) => s.clone(),
        _ => String::new(),
    }
}

// Fold an object literal to a CSS string, or None if any value is dynamic.
fn fold_object(obj: &ObjectLit) -> Option<String> {
    let mut decls: Vec<String> = vec![];
    for prop in &obj.props {
        let kv = match prop {
            PropOrSpread::Prop(pr) => match &**pr {
                Prop::KeyValue(kv) => kv,
                _ => return None,
            },
            PropOrSpread::Spread(_) => return None,
        };
        let key = static_key(&kv.key)?;
        if let Expr::Array(arr) = &*kv.value {
            let mut parts: Vec<String> = vec![];
            for el in &arr.elems {
                let el = match el {
                    Some(e) => e,
                    None => return None,
                };
                if el.spread.is_some() {
                    return None;
                }
                match static_scalar(&el.expr) {
                    s @ (Scalar::Str(_) | Scalar::Num(_)) => parts.push(format_value(&key, &s)),
                    _ => return None,
                }
            }
            decls.push(format!("{}:{}", to_kebab(&key), parts.join(" ")));
            continue;
        }
        match static_scalar(&kv.value) {
            Scalar::Dynamic => return None,
            Scalar::Drop => continue,
            s => decls.push(format!("{}:{}", to_kebab(&key), format_value(&key, &s))),
        }
    }
    Some(decls.join(";"))
}

fn key_value_prop(key: PropName, value: Expr) -> PropOrSpread {
    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
        key,
        value: Box::new(value),
    })))
}

// Move a bucket attribute's `{...}` props into the target bucket vec.
fn push_bucket(value: &mut Option<JSXAttrValue>, target: &mut Vec<PropOrSpread>) {
    if let Some(props) = attr_object_props(value) {
        target.extend(props);
    }
}

impl VisitMut for Exodra {
    fn visit_mut_expr(&mut self, e: &mut Expr) {
        match e {
            Expr::JSXElement(el) => {
                let new = self.transform_element(el);
                *e = new;
            }
            Expr::JSXFragment(frag) => {
                let new = self.transform_fragment(frag);
                *e = new;
            }
            other => other.visit_mut_children_with(self),
        }
    }

    fn visit_mut_module(&mut self, m: &mut Module) {
        // Collect user bindings BEFORE we transform, so helper imports can dodge a
        // shadowing local (a param/const named `h`/`text`/…).
        let mut collector = BindingCollector {
            names: HashSet::new(),
        };
        m.visit_with(&mut collector);
        self.bound = collector.names;

        m.visit_mut_children_with(self);

        // Static hoisting: give fully-static h() calls inside loops/.map() a shared
        // Symbol cacheKey, whose `const _ck = Symbol()` decls go above the code
        // (but below the imports we prepend next).
        if self.used_h {
            let h_name = self.local("h");
            let text_name = if self.used_text {
                self.local("text")
            } else {
                "text".to_string()
            };
            let mut taken = self.bound.clone();
            taken.extend(self.locals.values().cloned());
            let mut hoister = Hoister {
                h_name,
                text_name,
                in_iteration: 0,
                keys: vec![],
                taken,
                counter: 0,
            };
            m.visit_mut_with(&mut hoister);
            for decl in hoister.keys.into_iter().rev() {
                m.body.insert(0, decl);
            }
        }

        // Prepend imports. Insert at index 0 in reverse so the final order is
        // core, jsx (Fragment), attrs, forms, style.
        if self.used_style {
            let l = self.local("style");
            m.body
                .insert(0, import_decl(vec![named_import_as("style", &l)], "@exodra/style"));
        }
        if !self.forms.is_empty() {
            let names: Vec<&'static str> = self.forms.iter().copied().collect();
            let specs = names
                .into_iter()
                .map(|n| {
                    let l = self.local(n);
                    named_import_as(n, &l)
                })
                .collect();
            m.body.insert(0, import_decl(specs, "@exodra/forms"));
        }
        if self.used_merge_attrs {
            let l = self.local("mergeAttrs");
            m.body.insert(
                0,
                import_decl(vec![named_import_as("mergeAttrs", &l)], "@exodra/attrs"),
            );
        }
        if self.used_fragment {
            let l = self.local("Fragment");
            m.body.insert(
                0,
                import_decl(vec![named_import_as("Fragment", &l)], "@exodra/jsx"),
            );
        }
        let mut core: Vec<ImportSpecifier> = vec![];
        if self.used_h {
            let l = self.local("h");
            core.push(named_import_as("h", &l));
        }
        if self.used_text {
            let l = self.local("text");
            core.push(named_import_as("text", &l));
        }
        if !core.is_empty() {
            m.body.insert(0, import_decl(core, IMPORT_SOURCE));
        }
    }
}

fn import_decl(specifiers: Vec<ImportSpecifier>, src: &str) -> ModuleItem {
    ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
        span: DUMMY_SP,
        specifiers,
        src: Box::new(Str {
            span: DUMMY_SP,
            value: src.into(),
            raw: None,
        }),
        type_only: false,
        with: None,
        phase: Default::default(),
    }))
}

// Build an import specifier, aliasing `imported as local` only when they differ.
fn named_import_as(imported: &str, local: &str) -> ImportSpecifier {
    ImportSpecifier::Named(ImportNamedSpecifier {
        span: DUMMY_SP,
        local: ident(local),
        imported: if imported == local {
            None
        } else {
            Some(ModuleExportName::Ident(ident(imported)))
        },
        is_type_only: false,
    })
}

// ---- static hoisting (auto clone-cache) -----------------------------------
//
// A fully-static h(type, attrs) built many times inside a loop / .map() callback
// gets a generated `Symbol()` cacheKey as its 3rd arg (hoisted to module top), so
// the runtime builds it once and clones. Mirrors @exodra/babel-plugin-jsx's
// optimizeStaticSchemas. The h() call stays inline; only the key is shared.

struct Hoister {
    h_name: String,
    text_name: String,
    in_iteration: u32,
    keys: Vec<ModuleItem>,
    taken: HashSet<String>,
    counter: u32,
}

impl Hoister {
    fn gen_key(&mut self) -> String {
        loop {
            self.counter += 1;
            let name = if self.counter == 1 {
                "_ck".to_string()
            } else {
                format!("_ck{}", self.counter)
            };
            if !self.taken.contains(&name) {
                self.taken.insert(name.clone());
                return name;
            }
        }
    }
}

fn is_iteration_method(e: &Expr) -> bool {
    if let Expr::Member(m) = e {
        if let MemberProp::Ident(p) = &m.prop {
            return matches!(p.sym.as_ref(), "map" | "forEach" | "flatMap");
        }
    }
    false
}

fn is_h_call(n: &CallExpr, h_name: &str) -> bool {
    matches!(&n.callee, Callee::Expr(e)
        if matches!(&**e, Expr::Ident(i) if i.sym.as_ref() == h_name))
}

fn is_static_value(e: &Expr, h: &str, text: &str) -> bool {
    match e {
        Expr::Lit(lit) => matches!(
            lit,
            Lit::Str(_) | Lit::Num(_) | Lit::Bool(_) | Lit::Null(_)
        ),
        Expr::Object(o) => o.props.iter().all(|p| match p {
            PropOrSpread::Prop(pr) => match &**pr {
                Prop::KeyValue(kv) => is_static_value(&kv.value, h, text),
                _ => false,
            },
            _ => false,
        }),
        Expr::Array(a) => a.elems.iter().all(|el| {
            el.as_ref()
                .map(|e| e.spread.is_none() && is_static_value(&e.expr, h, text))
                .unwrap_or(false)
        }),
        Expr::Call(c) => {
            if let Callee::Expr(callee) = &c.callee {
                if let Expr::Ident(i) = &**callee {
                    if i.sym.as_ref() == h || i.sym.as_ref() == text {
                        return c
                            .args
                            .iter()
                            .all(|a| a.spread.is_none() && is_static_value(&a.expr, h, text));
                    }
                }
            }
            false
        }
        _ => false,
    }
}

// A templatable subtree: how many DOM nodes it materializes and whether it has
// per-instance "holes" (bindable attrs / handlers, patched after cloning).
struct TemplateInfo {
    has_holes: bool,
    node_count: u32,
}

// A plain lowercase element tag literal — not a component (Ident / capitalized)
// and not a special `#fragment` / `#text` type.
fn is_lowercase_tag_literal(e: &Expr) -> bool {
    if let Expr::Lit(Lit::Str(s)) = e {
        if let Some(v) = s.value.as_str() {
            if let Some(first) = v.chars().next() {
                return first != '#' && !first.is_uppercase();
            }
        }
    }
    false
}

fn object_has_key(obj: &ObjectLit, name: &str) -> bool {
    obj.props.iter().any(|p| {
        matches!(p, PropOrSpread::Prop(pr)
            if matches!(&**pr, Prop::KeyValue(kv)
                if matches!(&kv.key, PropName::Ident(k) if k.sym.as_ref() == name)))
    })
}

// Analyze whether an h() call is a clonable template — invariant structure with
// optional per-instance holes. Returns None the moment structure could vary.
// bindables (non-children) and handlers ARE allowed (they mark holes);
// bindableLists / bindables.children / bindableHandlers are not. Mirrors
// @exodra/babel-plugin-jsx's analyzeTemplate.
fn analyze_template(args: &[ExprOrSpread], h: &str, text: &str) -> Option<TemplateInfo> {
    if args.is_empty() || !is_lowercase_tag_literal(&args[0].expr) {
        return None;
    }
    let mut has_holes = false;
    let mut node_count: u32 = 1;

    if args.len() >= 2 {
        let props = match &*args[1].expr {
            Expr::Object(o) => o,
            _ => return None,
        };
        for prop in &props.props {
            let kv = match prop {
                PropOrSpread::Spread(_) => return None,
                PropOrSpread::Prop(pr) => match &**pr {
                    Prop::KeyValue(kv) => kv,
                    _ => return None,
                },
            };
            let key = match &kv.key {
                PropName::Ident(k) => k.sym.to_string(),
                _ => return None,
            };
            match key.as_str() {
                "bindableLists" | "bindableHandlers" => return None,
                "bindables" => {
                    let obj = match &*kv.value {
                        Expr::Object(o) => o,
                        _ => return None,
                    };
                    if object_has_key(obj, "children") {
                        return None; // insert-point, not a hole
                    }
                    has_holes = true;
                }
                "handlers" => {
                    if !matches!(&*kv.value, Expr::Object(_)) {
                        return None;
                    }
                    has_holes = true;
                }
                "static" => {
                    let obj = match &*kv.value {
                        Expr::Object(o) => o,
                        _ => return None,
                    };
                    for sp in &obj.props {
                        let skv = match sp {
                            PropOrSpread::Prop(pr) => match &**pr {
                                Prop::KeyValue(kv) => kv,
                                _ => return None,
                            },
                            _ => return None,
                        };
                        let sk = match &skv.key {
                            PropName::Ident(k) => k.sym.to_string(),
                            _ => return None,
                        };
                        if sk == "children" {
                            let info = analyze_children(&skv.value, h, text)?;
                            has_holes = has_holes || info.has_holes;
                            node_count += info.node_count;
                        } else if !is_static_value(&skv.value, h, text) {
                            return None; // dynamic value in the static bucket
                        }
                    }
                }
                _ => return None, // unknown bucket → be conservative
            }
        }
    }
    Some(TemplateInfo {
        has_holes,
        node_count,
    })
}

fn analyze_children(node: &Expr, h: &str, text: &str) -> Option<TemplateInfo> {
    if let Expr::Array(a) = node {
        let mut node_count = 0;
        let mut has_holes = false;
        for el in &a.elems {
            let el = el.as_ref()?;
            if el.spread.is_some() {
                return None;
            }
            let info = analyze_child(&el.expr, h, text)?;
            node_count += info.node_count;
            has_holes = has_holes || info.has_holes;
        }
        return Some(TemplateInfo {
            has_holes,
            node_count,
        });
    }
    analyze_child(node, h, text)
}

fn analyze_child(node: &Expr, h: &str, text: &str) -> Option<TemplateInfo> {
    if let Expr::Call(c) = node {
        if let Callee::Expr(callee) = &c.callee {
            if let Expr::Ident(i) = &**callee {
                if i.sym.as_ref() == h {
                    return analyze_template(&c.args, h, text);
                }
                if i.sym.as_ref() == text {
                    return if c
                        .args
                        .iter()
                        .all(|a| a.spread.is_none() && is_static_value(&a.expr, h, text))
                    {
                        Some(TemplateInfo {
                            has_holes: false,
                            node_count: 1,
                        })
                    } else {
                        None
                    };
                }
            }
        }
        return None; // arbitrary call (.map(), a helper) → dynamic structure
    }
    if matches!(
        node,
        Expr::Lit(Lit::Str(_)) | Expr::Lit(Lit::Num(_)) | Expr::Lit(Lit::Bool(_))
    ) {
        return Some(TemplateInfo {
            has_holes: false,
            node_count: 1,
        });
    }
    None // identifier / expression → dynamic
}

fn const_symbol_decl(name: &str) -> ModuleItem {
    ModuleItem::Stmt(Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent {
                id: ident(name),
                type_ann: None,
            }),
            init: Some(Box::new(call(Expr::Ident(ident("Symbol")), vec![]))),
            definite: false,
        }],
    }))))
}

impl VisitMut for Hoister {
    fn visit_mut_call_expr(&mut self, n: &mut CallExpr) {
        let is_iter = matches!(&n.callee, Callee::Expr(e) if is_iteration_method(e));
        if is_iter {
            self.in_iteration += 1;
        }

        // Check BEFORE recursing (top-down, matching Babel's enter-order): a static
        // parent must be keyed before its children get keys — otherwise the child's
        // fresh `_ck` 3rd arg would make the parent look non-static.
        if self.in_iteration > 0 && is_h_call(n, &self.h_name) && n.args.len() < 3 {
            if let Some(info) = analyze_template(&n.args, &self.h_name, &self.text_name) {
                // A single-node HOLE template isn't worth it — cloning + patching
                // one node doesn't beat building it. Fully-static nodes stay eligible.
                if !(info.has_holes && info.node_count < 2) {
                    if n.args.len() < 2 {
                        n.args.push(ExprOrSpread {
                            spread: None,
                            expr: Box::new(object(vec![])),
                        });
                    }
                    let key = self.gen_key();
                    self.keys.push(const_symbol_decl(&key));
                    n.args.push(ExprOrSpread {
                        spread: None,
                        expr: Box::new(Expr::Ident(ident(&key))),
                    });
                }
            }
        }

        n.visit_mut_children_with(self);
        if is_iter {
            self.in_iteration -= 1;
        }
    }

    fn visit_mut_for_stmt(&mut self, n: &mut ForStmt) {
        self.in_iteration += 1;
        n.visit_mut_children_with(self);
        self.in_iteration -= 1;
    }
    fn visit_mut_for_in_stmt(&mut self, n: &mut ForInStmt) {
        self.in_iteration += 1;
        n.visit_mut_children_with(self);
        self.in_iteration -= 1;
    }
    fn visit_mut_for_of_stmt(&mut self, n: &mut ForOfStmt) {
        self.in_iteration += 1;
        n.visit_mut_children_with(self);
        self.in_iteration -= 1;
    }
    fn visit_mut_while_stmt(&mut self, n: &mut WhileStmt) {
        self.in_iteration += 1;
        n.visit_mut_children_with(self);
        self.in_iteration -= 1;
    }
    fn visit_mut_do_while_stmt(&mut self, n: &mut DoWhileStmt) {
        self.in_iteration += 1;
        n.visit_mut_children_with(self);
        self.in_iteration -= 1;
    }
}

#[plugin_transform]
fn plugin(program: Program, _metadata: TransformPluginProgramMetadata) -> Program {
    program.apply(visit_mut_pass(Exodra {
        used_h: false,
        used_text: false,
        used_fragment: false,
        used_merge_attrs: false,
        used_style: false,
        forms: std::collections::BTreeSet::new(),
        bound: HashSet::new(),
        locals: HashMap::new(),
    }))
}
