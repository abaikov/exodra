use std::collections::HashSet;

use swc_core::ecma::ast::*;

fn unwrap_type_script(expr: &Expr) -> &Expr {
    match expr {
        Expr::Paren(e) => unwrap_type_script(&e.expr),
        Expr::TsAs(e) => unwrap_type_script(&e.expr),
        Expr::TsConstAssertion(e) => unwrap_type_script(&e.expr),
        Expr::TsSatisfies(e) => unwrap_type_script(&e.expr),
        Expr::TsTypeAssertion(e) => unwrap_type_script(&e.expr),
        Expr::TsNonNull(e) => unwrap_type_script(&e.expr),
        other => other,
    }
}

fn root_of(expr: &Expr) -> Option<&Ident> {
    let mut current = expr;
    loop {
        match current {
            Expr::Member(member) => {
                match &member.prop {
                    MemberProp::Ident(_) => {}
                    MemberProp::Computed(computed) => match &*computed.expr {
                        Expr::Lit(Lit::Str(_)) => {}
                        _ => return None,
                    },
                    MemberProp::PrivateName(_) => return None,
                }
                current = &member.obj;
            }
            Expr::Ident(ident) => return Some(ident),
            _ => return None,
        }
    }
}

// The schema is hoisted to module scope, so only a root that module scope sees means the same there.
pub(crate) fn read_module_value(expr: &Expr, module_values: &HashSet<Id>) -> Option<Expr> {
    let expr = unwrap_type_script(expr);
    let root = root_of(expr)?;
    if module_values.contains(&root.to_id()) {
        Some(expr.clone())
    } else {
        None
    }
}
