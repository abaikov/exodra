//! THE HANDFUL OF NODE SHAPES THE OUTPUT IS MADE OF.
//!
//! Every line the schema compiler emits is a call on a cursor, a `const` at module scope,
//! or an arrow. Written once here so the walk reads as what it is doing rather than as
//! SWC struct literals.
//!
//! NOTHING HERE RETURNS A NODE THAT IS THEN REUSED. Identifiers are carried as NAMES
//! and a fresh node is built at every use — the same rule the Babel plugin follows,
//! for the same reason: one node appearing in two places is a node a later pass has
//! registered as both a binding and a reference to itself.

use swc_core::common::{SyntaxContext, DUMMY_SP};
use swc_core::ecma::ast::*;

use crate::{call, ident, ident_name};

pub(crate) fn ident_expr(name: &str) -> Expr {
    Expr::Ident(ident(name))
}

pub(crate) fn pat_ident(name: &str) -> Pat {
    Pat::Ident(BindingIdent {
        id: ident(name),
        type_ann: None,
    })
}

pub(crate) fn null_expr() -> Expr {
    Expr::Lit(Lit::Null(Null { span: DUMMY_SP }))
}

pub(crate) fn bool_expr(value: bool) -> Expr {
    Expr::Lit(Lit::Bool(Bool {
        span: DUMMY_SP,
        value,
    }))
}

pub(crate) fn num_expr(value: f64) -> Expr {
    Expr::Lit(Lit::Num(Number {
        span: DUMMY_SP,
        value,
        raw: None,
    }))
}

/// `object.property`
pub(crate) fn member_expr(obj: Expr, property: &str) -> Expr {
    Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(obj),
        prop: MemberProp::Ident(ident_name(property)),
    })
}

/// `name.method(args);` — a statement, which is every line of a schema cursor.
pub(crate) fn member_call_stmt(name: &str, method: &str, args: Vec<Expr>) -> Stmt {
    Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call(member_expr(ident_expr(name), method), args)),
    })
}

pub(crate) fn arrow(params: Vec<Pat>, stmts: Vec<Stmt>) -> Expr {
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        params,
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts,
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
    })
}

pub(crate) fn const_decl(name: &str, init: Expr) -> Stmt {
    Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: pat_ident(name),
            init: Some(Box::new(init)),
            definite: false,
        }],
    })))
}

pub(crate) fn object_prop(key: PropName, value: Expr) -> PropOrSpread {
    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
        key,
        value: Box::new(value),
    })))
}

/// A key that can be written bare in an object literal, and one that cannot —
/// `class: "row"` against `"data-kind": "row"`.
pub(crate) fn prop_key(key: &str) -> PropName {
    let mut chars = key.chars();
    let plain = match chars.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' || c == '$' => {
            chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$')
        }
        _ => false,
    };
    if plain {
        PropName::Ident(ident_name(key))
    } else {
        PropName::Str(Str {
            span: DUMMY_SP,
            value: key.into(),
            raw: None,
        })
    }
}

/// Babel has no parenthesis node — `($) => (<li/>)` reaches its plugin as the JSX itself.
/// SWC keeps the `ParenExpr`, so every place this compiler asks "is this a JSX element"
/// or "is this a port" has to look through one, or the most common way to write a
/// declaration would be refused for a reason the author cannot see.
pub(crate) fn unwrap_paren(expr: &Expr) -> &Expr {
    match expr {
        Expr::Paren(p) => unwrap_paren(&p.expr),
        other => other,
    }
}
