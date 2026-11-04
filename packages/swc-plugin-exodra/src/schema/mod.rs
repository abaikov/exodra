//! `exoJsx(($) => <markup/>)` → one module-level `createExoNamedSchema(...)` declaration.
//!
//! This is the Rust port of `@exodra/babel-plugin-schema`, which is the specification: the
//! generated identifiers and the wording of every refusal match it exactly.
//!
//! The JSX is a pure schema declaration. A literal attribute is markup; everything that
//! varies is a port named off the parameter, and the machine fills it by that name:
//!
//! ```jsx
//! const ROW = exoJsx(($) => (
//!     <li class="row" data-id={$.id} onClick={$.toggle}>
//!         <span>{$.title}</span>
//!         <$.rows />
//!     </li>
//! ));
//! ```
//!
//! becomes `const _s0 = createExoNamedSchema(_b0 => { … });` in front of the statement the
//! call stood in, and the call itself becomes `_s0`. Anything that is not markup or a named
//! port is refused at compile time.

mod ast;
mod compile_jsx_declaration;
mod emit_declared_element;
mod names;
mod read_module_constant_string;
mod read_module_value;
mod read_port_name;
mod read_static_attribute;

use std::collections::{HashMap, HashSet};

use swc_core::common::Span;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

use ast::{null_expr, unwrap_paren};
use compile_jsx_declaration::compile_jsx_declaration;
use names::{FileState, GeneratedNames};
use read_module_constant_string::read_module_constant_string;

use crate::{emit_err, import_decl, named_import_as, BindingCollector};

pub(crate) type Refusal = (Span, String);

pub(crate) struct SchemaOptions {
    pub(crate) schema_source: String,
    pub(crate) schema_import: String,
    pub(crate) marker_name: String,
}

impl Default for SchemaOptions {
    fn default() -> Self {
        Self {
            schema_source: "@exodra/core".to_string(),
            schema_import: "createExoNamedSchema".to_string(),
            marker_name: "exoJsx".to_string(),
        }
    }
}

struct ReferencedNames {
    names: HashSet<String>,
}

impl Visit for ReferencedNames {
    fn visit_import_decl(&mut self, _: &ImportDecl) {}
    fn visit_ident(&mut self, n: &Ident) {
        self.names.insert(n.sym.to_string());
    }
}

pub(crate) struct ExodraSchema {
    opts: SchemaOptions,
    names: GeneratedNames,
    file: FileState,
    markers: HashSet<String>,
    hoisted: Vec<ModuleItem>,
    refused: bool,
    module_constants: HashMap<Id, String>,
    module_values: HashSet<Id>,
}

impl ExodraSchema {
    pub(crate) fn new(opts: SchemaOptions) -> Self {
        let names = GeneratedNames::new(&HashSet::new(), &opts.schema_import);
        let mut markers = HashSet::new();
        markers.insert(opts.marker_name.clone());
        Self {
            opts,
            names,
            file: FileState::default(),
            markers,
            hoisted: vec![],
            refused: false,
            module_constants: HashMap::new(),
            module_values: HashSet::new(),
        }
    }

    fn marker_callee(&self, expr: &Expr) -> Option<String> {
        let call = match expr {
            Expr::Call(call) => call,
            _ => return None,
        };
        let callee = match &call.callee {
            Callee::Expr(callee) => callee,
            _ => return None,
        };
        match unwrap_paren(callee) {
            Expr::Ident(i) if self.markers.contains(i.sym.as_str()) => Some(i.sym.to_string()),
            _ => None,
        }
    }

    // Babel throws on its first refusal, so only the first one is reported here too.
    fn refuse(&mut self, span: Span, message: String) {
        if !self.refused {
            self.refused = true;
            emit_err(span, message);
        }
    }

    fn collect_markers(&mut self, module: &Module) {
        for item in &module.body {
            let import = match item {
                ModuleItem::ModuleDecl(ModuleDecl::Import(import)) => import,
                _ => continue,
            };
            for spec in &import.specifiers {
                let (local, type_only) = match spec {
                    ImportSpecifier::Named(s) => (&s.local, import.type_only || s.is_type_only),
                    ImportSpecifier::Default(s) => (&s.local, import.type_only),
                    ImportSpecifier::Namespace(s) => (&s.local, import.type_only),
                };
                if !type_only {
                    self.module_values.insert(local.to_id());
                }
                let named = match spec {
                    ImportSpecifier::Named(named) => named,
                    _ => continue,
                };
                let imported = match &named.imported {
                    Some(ModuleExportName::Ident(i)) => i.sym.to_string(),
                    Some(ModuleExportName::Str(s)) => match s.value.as_str() {
                        Some(v) => v.to_string(),
                        None => continue,
                    },
                    None => named.local.sym.to_string(),
                };
                if imported == self.opts.marker_name {
                    self.markers.insert(named.local.sym.to_string());
                }
            }
        }
    }

    // A whole statement is read before any of it is kept, so a const never folds into its own statement.
    fn collect_module_constants(&mut self, item: &ModuleItem) {
        let var = match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Var(var))) => var,
            ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Var(var),
                ..
            })) => var,
            _ => return,
        };
        if var.kind != VarDeclKind::Const {
            return;
        }
        for decl in &var.decls {
            if let Pat::Ident(binding) = &decl.name {
                self.module_values.insert(binding.id.to_id());
            }
        }
        let folded: Vec<(Id, String)> = var
            .decls
            .iter()
            .filter_map(|decl| {
                let name = match &decl.name {
                    Pat::Ident(binding) => binding.id.to_id(),
                    _ => return None,
                };
                let value = read_module_constant_string(decl.init.as_deref()?, &self.module_constants)?;
                Some((name, value))
            })
            .collect();
        self.module_constants.extend(folded);
    }

    fn drop_unreferenced_markers(&self, module: &mut Module) {
        let mut referenced = ReferencedNames {
            names: HashSet::new(),
        };
        module.visit_with(&mut referenced);
        let markers = &self.markers;
        module.body.retain_mut(|item| {
            let import = match item {
                ModuleItem::ModuleDecl(ModuleDecl::Import(import)) => import,
                _ => return true,
            };
            let before = import.specifiers.len();
            import.specifiers.retain(|spec| {
                let local = match spec {
                    ImportSpecifier::Named(s) => &s.local,
                    ImportSpecifier::Default(s) => &s.local,
                    ImportSpecifier::Namespace(s) => &s.local,
                };
                !markers.contains(local.sym.as_str())
                    || referenced.names.contains(local.sym.as_str())
            });
            before == 0 || !import.specifiers.is_empty()
        });
    }
}

impl VisitMut for ExodraSchema {
    fn visit_mut_module(&mut self, module: &mut Module) {
        let mut collector = BindingCollector {
            names: HashSet::new(),
        };
        module.visit_with(&mut collector);
        self.names = GeneratedNames::new(&collector.names, &self.opts.schema_import);
        self.collect_markers(module);

        let body = std::mem::take(&mut module.body);
        let mut out: Vec<ModuleItem> = Vec::with_capacity(body.len());
        for mut item in body {
            item.visit_mut_with(self);
            self.collect_module_constants(&item);
            out.append(&mut self.hoisted);
            out.push(item);
        }
        module.body = out;

        if !self.file.compiled {
            return;
        }
        self.drop_unreferenced_markers(module);
        module.body.insert(
            0,
            import_decl(
                vec![named_import_as(
                    &self.opts.schema_import,
                    &self.names.schema_factory,
                )],
                &self.opts.schema_source,
            ),
        );
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Some(marker) = self.marker_callee(expr) {
            let compiled = match &*expr {
                Expr::Call(call) => {
                    compile_jsx_declaration(
                        call,
                        &marker,
                        &self.names,
                        &mut self.file,
                        &self.module_constants,
                        &self.module_values,
                    )
                }
                _ => return,
            };
            match compiled {
                Ok(declaration) => {
                    self.hoisted.push(declaration.hoisted);
                    *expr = declaration.replacement;
                }
                Err((span, message)) => {
                    self.refuse(span, message);
                    *expr = null_expr();
                }
            }
            return;
        }
        let marker = &self.opts.marker_name;
        let refusal = match &*expr {
            Expr::JSXElement(el) => Some((
                el.span,
                format!(
                    "Exodra JSX: JSX outside {marker}() cannot be compiled — JSX here is a \
                     schema declaration, built once per module. Wrap it: \
                     {marker}(($) => <li …/>)."
                ),
            )),
            Expr::JSXFragment(fragment) => Some((
                fragment.span,
                "Exodra JSX: a fragment cannot be compiled — a declaration is one element."
                    .to_string(),
            )),
            _ => None,
        };
        match refusal {
            Some((span, message)) => {
                self.refuse(span, message);
                *expr = null_expr();
            }
            None => expr.visit_mut_children_with(self),
        }
    }
}
