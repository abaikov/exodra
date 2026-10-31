use swc_core::common::DUMMY_SP;
use swc_core::ecma::ast::*;

use super::ast::{bool_expr, num_expr, unwrap_paren};

// Rebuilt with no `raw`, so the printer writes the value and not the author's quoting.
pub(crate) fn read_static_attribute(value: &Option<JSXAttrValue>) -> Option<Expr> {
    match value {
        None => Some(bool_expr(true)),
        Some(JSXAttrValue::Str(s)) => Some(rebuilt_string(s)),
        Some(JSXAttrValue::JSXExprContainer(container)) => match &container.expr {
            JSXExpr::Expr(expr) => match unwrap_paren(expr) {
                Expr::Lit(Lit::Str(s)) => Some(rebuilt_string(s)),
                Expr::Lit(Lit::Num(n)) => Some(num_expr(n.value)),
                Expr::Lit(Lit::Bool(b)) => Some(bool_expr(b.value)),
                _ => None,
            },
            JSXExpr::JSXEmptyExpr(_) => None,
        },
        Some(_) => None,
    }
}

fn rebuilt_string(s: &Str) -> Expr {
    Expr::Lit(Lit::Str(Str {
        span: DUMMY_SP,
        value: s.value.clone(),
        raw: None,
    }))
}
