use std::collections::HashMap;

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

// Keyed by binding `Id`, so a local const or the declaration's parameter never matches a module one.
pub(crate) fn read_module_constant_string(
    expr: &Expr,
    module_constants: &HashMap<Id, String>,
) -> Option<String> {
    match unwrap_type_script(expr) {
        Expr::Lit(Lit::Str(s)) => s.value.as_str().map(str::to_string),
        Expr::Tpl(tpl) => {
            let mut value = tpl.quasis.first()?.cooked.as_ref()?.as_str()?.to_string();
            for (at, part) in tpl.exprs.iter().enumerate() {
                value.push_str(&read_module_constant_string(part, module_constants)?);
                value.push_str(tpl.quasis.get(at + 1)?.cooked.as_ref()?.as_str()?);
            }
            Some(value)
        }
        Expr::Ident(i) => module_constants.get(&i.to_id()).cloned(),
        _ => None,
    }
}
