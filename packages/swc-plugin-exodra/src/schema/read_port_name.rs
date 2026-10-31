use swc_core::ecma::ast::*;

use super::ast::unwrap_paren;

pub(crate) fn read_port_name(value: &Expr, holder: Option<&str>) -> Option<String> {
    let holder = holder?;
    let member = match unwrap_paren(value) {
        Expr::Member(member) => member,
        _ => return None,
    };
    match unwrap_paren(&member.obj) {
        Expr::Ident(object) if object.sym.as_str() == holder => {}
        _ => return None,
    }
    match &member.prop {
        MemberProp::Ident(property) => Some(property.sym.to_string()),
        MemberProp::Computed(computed) => match unwrap_paren(&computed.expr) {
            Expr::Lit(Lit::Str(s)) => s.value.as_str().map(str::to_string),
            _ => None,
        },
        MemberProp::PrivateName(_) => None,
    }
}
