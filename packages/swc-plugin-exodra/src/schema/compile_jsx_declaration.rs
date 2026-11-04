use std::collections::{HashMap, HashSet};

use swc_core::common::Span;
use swc_core::ecma::ast::*;

use super::ast::{arrow, const_decl, ident_expr, pat_ident, unwrap_paren};
use super::emit_declared_element::{emit_declared_element, DeclarationWalk};
use super::names::{FileState, GeneratedNames};
use super::Refusal;
use crate::call;

pub(crate) struct CompiledJsxDeclaration {
    pub(crate) hoisted: ModuleItem,
    pub(crate) replacement: Expr,
}

#[derive(Clone, Copy)]
enum DeclarationFn<'a> {
    Arrow(&'a ArrowExpr),
    Function(&'a FnExpr),
}

fn read_declaration_root<'a>(
    declaration: DeclarationFn<'a>,
    marker: &str,
    span: Span,
) -> Result<&'a JSXElement, Refusal> {
    let stmts = match declaration {
        DeclarationFn::Arrow(a) => match &*a.body {
            BlockStmtOrExpr::Expr(expr) => match unwrap_paren(expr) {
                Expr::JSXElement(el) => return Ok(&**el),
                _ => None,
            },
            BlockStmtOrExpr::BlockStmt(block) => Some(&block.stmts),
        },
        DeclarationFn::Function(f) => f.function.body.as_ref().map(|body| &body.stmts),
    };
    if let Some([Stmt::Return(ReturnStmt { arg: Some(arg), .. })]) = stmts.map(|s| s.as_slice()) {
        if let Expr::JSXElement(el) = unwrap_paren(arg) {
            return Ok(&**el);
        }
    }
    Err((
        span,
        format!(
            "Exodra JSX: {marker}(($) => <div …/>) returns ONE element and does nothing else. A \
             declaration is built once when the module loads, so there is no per-instance work \
             to put before the return: that belongs to the machine."
        ),
    ))
}

fn read_holder(
    declaration: DeclarationFn<'_>,
    marker: &str,
    span: Span,
) -> Result<Option<String>, Refusal> {
    let params: Vec<&Pat> = match declaration {
        DeclarationFn::Arrow(a) => a.params.iter().collect(),
        DeclarationFn::Function(f) => f.function.params.iter().map(|p| &p.pat).collect(),
    };
    match params.as_slice() {
        [] => Ok(None),
        [Pat::Ident(param)] => Ok(Some(param.id.sym.to_string())),
        _ => Err((
            span,
            format!(
                "Exodra JSX: {marker}(fn) takes ONE plain parameter, the port names: ($) => …, \
                 and every port is named off it where it stands — {{$.title}}, \
                 onClick={{$.toggle}}."
            ),
        )),
    }
}

pub(crate) fn compile_jsx_declaration(
    call_expr: &CallExpr,
    marker: &str,
    names: &GeneratedNames,
    file: &mut FileState,
    module_constants: &HashMap<Id, String>,
    module_values: &HashSet<Id>,
) -> Result<CompiledJsxDeclaration, Refusal> {
    let declaration = match call_expr.args.as_slice() {
        [only] if only.spread.is_none() => match unwrap_paren(&only.expr) {
            Expr::Arrow(a) => Some(DeclarationFn::Arrow(a)),
            Expr::Fn(f) => Some(DeclarationFn::Function(f)),
            _ => None,
        },
        _ => None,
    };
    let declaration = declaration.ok_or_else(|| {
        (
            call_expr.span,
            format!(
                "Exodra JSX: {marker}() takes exactly one function literal — it is read at build \
                 time, so it cannot be a reference to one declared elsewhere."
            ),
        )
    })?;
    let root = read_declaration_root(declaration, marker, call_expr.span)?;
    let root_cursor = format!("{}0", names.cursor);
    let mut walk = DeclarationWalk {
        cursor: names.cursor.clone(),
        holder: read_holder(declaration, marker, call_expr.span)?,
        port_names: HashSet::new(),
        module_constants,
        module_values,
    };
    let root_statement = emit_declared_element(root, &root_cursor, 1, &mut walk)?;
    let schema_name = format!("{}{}", names.schema, file.schemas);
    file.schemas += 1;
    file.compiled = true;
    Ok(CompiledJsxDeclaration {
        hoisted: ModuleItem::Stmt(const_decl(
            &schema_name,
            call(
                ident_expr(&names.schema_factory),
                vec![arrow(vec![pat_ident(&root_cursor)], vec![root_statement])],
            ),
        )),
        replacement: ident_expr(&schema_name),
    })
}
