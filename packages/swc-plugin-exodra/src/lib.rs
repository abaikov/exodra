//! THE SWC HALF OF EXODRA'S JSX COMPILER — one Wasm plugin, for the toolchains that
//! cannot run a Babel plugin (Next.js's default compiler, `@swc/jest`, `swc-loader`).
//!
//! It compiles `exoJsx(($) => <markup/>)`, a schema declaration with named ports, into a
//! module-level `createExoNamedSchema(...)`. Its Babel sibling `@exodra/babel-plugin-schema`
//! is the specification `src/schema/` is written against, down to the generated
//! identifiers and the wording of every refusal. See `src/schema/mod.rs`.
//!
//! WHAT LIVES IN THIS FILE, besides the plugin entry point, is the small set of helpers
//! `src/schema/` reaches for through `crate::` — AST builders, JSX name flattening, the
//! JSX whitespace rule, and the diagnostic channel. They are here rather than in
//! `schema/` because they are about SWC's AST and not about this compiler.

mod schema;

use std::collections::HashSet;
use swc_core::common::{Span, SyntaxContext, DUMMY_SP};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{visit_mut_pass, Visit, VisitWith};
use swc_core::plugin::errors::HANDLER;
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

// Collect every name bound anywhere in the module (params, decls, imports, catch)
// so a helper import can dodge a user binding of the same name.
pub(crate) struct BindingCollector {
    pub(crate) names: HashSet<String>,
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
    fn visit_fn_expr(&mut self, n: &FnExpr) {
        if let Some(ident) = &n.ident {
            self.names.insert(ident.sym.to_string());
        }
        n.visit_children_with(self);
    }
    fn visit_class_expr(&mut self, n: &ClassExpr) {
        if let Some(ident) = &n.ident {
            self.names.insert(ident.sym.to_string());
        }
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

pub(crate) fn ident(sym: &str) -> Ident {
    Ident {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        sym: sym.into(),
        optional: false,
    }
}

pub(crate) fn ident_name(sym: &str) -> IdentName {
    IdentName {
        span: DUMMY_SP,
        sym: sym.into(),
    }
}

pub(crate) fn str_lit(s: &str) -> Expr {
    Expr::Lit(Lit::Str(Str {
        span: DUMMY_SP,
        value: s.into(),
        raw: None,
    }))
}

pub(crate) fn call(callee: Expr, args: Vec<Expr>) -> Expr {
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

pub(crate) fn object(props: Vec<PropOrSpread>) -> Expr {
    Expr::Object(ObjectLit {
        span: DUMMY_SP,
        props,
    })
}

pub(crate) fn jsx_name_to_string(name: &JSXElementName) -> String {
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

// Clean a JSXText value per the JSX whitespace rules (identical to React / Babel,
// and to `@exodra/babel-plugin-schema`'s cleanJsxText): whitespace adjacent to a
// newline is trimmed and whitespace-only lines are dropped, but a same-line space
// is SIGNIFICANT and preserved.
pub(crate) fn clean_jsx_text(raw: &str) -> String {
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
pub(crate) fn emit_err(span: Span, msg: String) {
    HANDLER.with(|handler| handler.struct_span_err(span, &msg).emit());
}

pub(crate) fn import_decl(specifiers: Vec<ImportSpecifier>, src: &str) -> ModuleItem {
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
pub(crate) fn named_import_as(imported: &str, local: &str) -> ImportSpecifier {
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

// ---- plugin entry ---------------------------------------------------------

/// The config, read out of the JSON the host hands us. Every key is optional and an
/// unreadable config is treated as an empty one — with a diagnostic, because a config
/// key that was silently dropped would compile something other than what was asked for.
/// An empty config is this compiler with its defaults.
///
/// `mode` selects nothing, since there is one dialect; it is read only so that a value
/// naming another dialect is refused instead of quietly compiling this one.
fn read_config(json: Option<String>) -> schema::SchemaOptions {
    let mut options = schema::SchemaOptions::default();
    let raw = match json {
        Some(raw) if !raw.trim().is_empty() => raw,
        _ => return options,
    };
    let value: serde_json::Value = match serde_json::from_str(&raw) {
        Ok(value) => value,
        Err(err) => {
            emit_err(
                DUMMY_SP,
                format!("Exodra JSX: the plugin config is not valid JSON ({err})."),
            );
            return options;
        }
    };
    let string = |key: &str| -> Option<String> {
        value
            .get(key)
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    };
    match string("mode").as_deref() {
        None | Some("schema") => {}
        Some("legacy") => emit_err(
            DUMMY_SP,
            "Exodra JSX: \"legacy\" was the three-props dialect — prop buckets compiled to \
             h() / text() — and it has been removed along with the runtime it targeted. \
             Drop the \"mode\" key: \"schema\" is the only dialect, and it is the default."
                .to_string(),
        ),
        Some(other) => emit_err(
            DUMMY_SP,
            format!(
                "Exodra JSX: \"{other}\" is not a mode. \"schema\" compiles exoJsx() \
                 declarations into createExoNamedSchema(), and is the only dialect this plugin \
                 has — an omitted \"mode\" selects it."
            ),
        ),
    }
    if let Some(v) = string("schemaSource") {
        options.schema_source = v;
    }
    if let Some(v) = string("schemaImport") {
        options.schema_import = v;
    }
    if let Some(v) = string("markerName") {
        options.marker_name = v;
    }
    options
}

#[plugin_transform]
fn plugin(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    let options = read_config(metadata.get_transform_plugin_config());
    program.apply(visit_mut_pass(schema::ExodraSchema::new(options)))
}
