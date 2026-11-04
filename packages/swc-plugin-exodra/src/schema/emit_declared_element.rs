use std::collections::{HashMap, HashSet};

use swc_core::common::Span;
use swc_core::ecma::ast::*;

use super::ast::{arrow, member_call_stmt, null_expr, object_prop, pat_ident, prop_key};
use super::read_module_value::read_module_value;
use super::read_port_name::read_port_name;
use super::read_static_attribute::read_static_attribute;
use super::Refusal;
use crate::{clean_jsx_text, jsx_name_to_string, object, str_lit};

pub(crate) struct DeclarationWalk<'a> {
    pub(crate) cursor: String,
    pub(crate) holder: Option<String>,
    pub(crate) port_names: HashSet<String>,
    pub(crate) module_constants: &'a HashMap<Id, String>,
    pub(crate) module_values: &'a HashSet<Id>,
}

enum DeclaredKid<'a> {
    Text(String),
    Element(&'a JSXElement),
    ChildrenPort(String),
    TextPort(String),
}

fn claim_port_name(name: &str, span: Span, walk: &mut DeclarationWalk) -> Result<Expr, Refusal> {
    if walk.port_names.contains(name) {
        return Err((
            span,
            format!(
                "Exodra JSX: the port \"{name}\" is declared twice. A port is ONE place in the \
                 markup; two places that show the same value are two ports the machine writes."
            ),
        ));
    }
    walk.port_names.insert(name.to_string());
    Ok(str_lit(name))
}

fn read_attribute_port_name(
    label: &str,
    tag: &str,
    attr: &JSXAttr,
    walk: &DeclarationWalk,
) -> Result<String, Refusal> {
    let name = match &attr.value {
        Some(JSXAttrValue::JSXExprContainer(container)) => match &container.expr {
            JSXExpr::Expr(expr) => read_port_name(expr, walk.holder.as_deref()),
            JSXExpr::JSXEmptyExpr(_) => None,
        },
        _ => None,
    };
    name.ok_or_else(|| {
        (
            attr.span,
            format!(
                "Exodra JSX: {label} on <{tag}> takes a port — write {label}={{$.name}}. A \
                 declaration holds markup and named ports only; what the port shows is written \
                 by the machine, c.attr(P.name, …) / c.on(P.name, …), never by the markup."
            ),
        )
    })
}

const FOLDED_ATTRIBUTE_VALUES: &str = " A const string declared by an earlier statement of \
    this module is folded in, and so is a template made of such strings; an import or such a \
    const, or a.b / a[\"b\"] off one, is read once when the schema compiles; a let, a local \
    value or a call is neither.";

fn expression_refusal(span: Span, place: &str, tail: &str) -> Refusal {
    (
        span,
        format!(
            "Exodra JSX: {place} is an expression, and a declaration holds markup and named \
             ports only. Write a literal for markup, or name a port with $.name and fill it from \
             the machine.{tail}"
        ),
    )
}

fn children_port_name(name: &JSXElementName, holder: Option<&str>) -> Option<String> {
    let holder = holder?;
    match name {
        JSXElementName::JSXMemberExpr(member) => match &member.obj {
            JSXObject::Ident(object) if object.sym.as_str() == holder => {
                Some(member.prop.sym.to_string())
            }
            _ => None,
        },
        _ => None,
    }
}

fn read_children_port_tag(el: &JSXElement, label: &str) -> Result<(), Refusal> {
    if !el.opening.attrs.is_empty() {
        return Err((
            el.span,
            format!(
                "Exodra JSX: <{label} /> is a children port and takes no attributes — what \
                 stands there is built by the machine: c.one, c.list or c.childList(P.name)."
            ),
        ));
    }
    for child in &el.children {
        if let JSXElementChild::JSXText(text) = child {
            if clean_jsx_text(&text.value).is_empty() {
                continue;
            }
        }
        return Err((
            el.span,
            format!(
                "Exodra JSX: <{label} /> is a children port and takes no children — what stands \
                 there is built by the machine."
            ),
        ));
    }
    Ok(())
}

fn is_element_tag(name: &JSXElementName) -> bool {
    match name {
        JSXElementName::Ident(i) => !i
            .sym
            .chars()
            .next()
            .map(|c| c.is_ascii_uppercase())
            .unwrap_or(false),
        _ => false,
    }
}

fn collect_kids<'a>(
    el: &'a JSXElement,
    tag: &str,
    walk: &DeclarationWalk,
) -> Result<Vec<DeclaredKid<'a>>, Refusal> {
    let mut out: Vec<DeclaredKid<'a>> = vec![];
    for child in &el.children {
        match child {
            JSXElementChild::JSXText(text) => {
                let value = clean_jsx_text(&text.value);
                if !value.is_empty() {
                    out.push(DeclaredKid::Text(value));
                }
            }
            JSXElementChild::JSXElement(child) => {
                let name = &child.opening.name;
                if let Some(port) = children_port_name(name, walk.holder.as_deref()) {
                    read_children_port_tag(child, &jsx_name_to_string(name))?;
                    out.push(DeclaredKid::ChildrenPort(port));
                    continue;
                }
                if !is_element_tag(name) {
                    return Err((
                        child.span,
                        format!(
                            "Exodra JSX: <{}> is not an element, and a declaration has no \
                             components. Declare a children port where its instances stand, \
                             <$.rows />, and build them from the machine.",
                            jsx_name_to_string(name)
                        ),
                    ));
                }
                out.push(DeclaredKid::Element(&**child));
            }
            JSXElementChild::JSXExprContainer(container) => match &container.expr {
                JSXExpr::JSXEmptyExpr(_) => {}
                JSXExpr::Expr(expr) => match read_port_name(expr, walk.holder.as_deref()) {
                    Some(name) => out.push(DeclaredKid::TextPort(name)),
                    None => {
                        return Err(expression_refusal(
                            container.span,
                            &format!("{{…}} inside <{tag}>"),
                            "",
                        ))
                    }
                },
            },
            JSXElementChild::JSXFragment(fragment) => {
                return Err((
                    fragment.span,
                    "Exodra JSX: a fragment has no place in a declaration — every node of a \
                     schema is an element, text or a port."
                        .to_string(),
                ))
            }
            JSXElementChild::JSXSpreadChild(spread) => {
                return Err((
                    spread.span,
                    format!("Exodra JSX: unsupported child inside <{tag}>."),
                ))
            }
        }
    }
    Ok(out)
}

pub(crate) fn emit_declared_element(
    el: &JSXElement,
    parent: &str,
    depth: u32,
    walk: &mut DeclarationWalk,
) -> Result<Stmt, Refusal> {
    let tag = match &el.opening.name {
        JSXElementName::Ident(i) => i.sym.to_string(),
        other => {
            return Err((
                el.span,
                format!(
                    "Exodra JSX: <{}> is not an element tag. A declared node is a plain element \
                     name.",
                    jsx_name_to_string(other)
                ),
            ))
        }
    };
    let cursor = format!("{}{}", walk.cursor, depth);
    let mut statics: Vec<PropOrSpread> = vec![];
    let mut body: Vec<Stmt> = vec![];
    let mut content_taken = false;

    for attr in &el.opening.attrs {
        let attr = match attr {
            JSXAttrOrSpread::JSXAttr(attr) => attr,
            JSXAttrOrSpread::SpreadElement(spread) => {
                return Err((
                    spread.dot3_token,
                    format!(
                        "Exodra JSX: {{...spread}} on <{tag}> — every attribute is read at build \
                         time to decide whether it is markup or a port."
                    ),
                ))
            }
        };
        let key = match &attr.name {
            JSXAttrName::JSXNamespacedName(namespaced) => {
                let namespace = namespaced.ns.sym.to_string();
                let event = namespaced.name.sym.to_string();
                if namespace != "on" {
                    return Err((
                        attr.span,
                        format!(
                            "Exodra JSX: \"{namespace}:{event}\" on <{tag}> — the one namespace \
                             is on:, for event ports. An attribute port is {event}={{$.name}}."
                        ),
                    ));
                }
                let port = read_attribute_port_name(&format!("on:{event}"), &tag, attr, walk)?;
                let name = claim_port_name(&port, attr.span, walk)?;
                body.push(member_call_stmt(
                    &cursor,
                    "eventPort",
                    vec![str_lit(&event), name],
                ));
                continue;
            }
            JSXAttrName::Ident(key) => key.sym.to_string(),
        };
        let third = key.as_bytes().get(2).copied();
        let is_on = key.starts_with("on");
        if is_on && third.map(|c| c.is_ascii_uppercase()).unwrap_or(false) {
            let port = read_attribute_port_name(&key, &tag, attr, walk)?;
            let name = claim_port_name(&port, attr.span, walk)?;
            body.push(member_call_stmt(
                &cursor,
                "eventPort",
                vec![str_lit(&key[2..].to_lowercase()), name],
            ));
            continue;
        }
        if is_on && third.map(|c| c.is_ascii_lowercase()).unwrap_or(false) {
            let upper = (third.unwrap_or_default() as char).to_ascii_uppercase();
            let tail = &key[3..];
            let event = &key[2..];
            return Err((
                attr.span,
                format!(
                    "Exodra JSX: \"{key}\" on <{tag}> is an inline HTML handler — a string of \
                     script in the markup. Declare an event port: on{upper}{tail}={{$.name}}, or \
                     on:{event}={{$.name}} for an event name kept as written."
                ),
            ));
        }
        if key == "ref" {
            let port = read_attribute_port_name(&key, &tag, attr, walk)?;
            let name = claim_port_name(&port, attr.span, walk)?;
            body.push(member_call_stmt(&cursor, "refPort", vec![name]));
            continue;
        }
        if key == "unsafeHtml" {
            let port = read_attribute_port_name(&key, &tag, attr, walk)?;
            let name = claim_port_name(&port, attr.span, walk)?;
            body.push(member_call_stmt(&cursor, "childrenPort", vec![name]));
            content_taken = true;
            continue;
        }
        if let Some(literal) = read_static_attribute(&attr.value, walk.module_constants) {
            statics.push(object_prop(prop_key(&key), literal));
            continue;
        }
        let port = match &attr.value {
            Some(JSXAttrValue::JSXExprContainer(container)) => match &container.expr {
                JSXExpr::Expr(expr) => read_port_name(expr, walk.holder.as_deref()),
                JSXExpr::JSXEmptyExpr(_) => None,
            },
            _ => None,
        };
        let port = match port {
            Some(port) => port,
            None => {
                let module_value = match &attr.value {
                    Some(JSXAttrValue::JSXExprContainer(container)) => match &container.expr {
                        JSXExpr::Expr(expr) => read_module_value(expr, walk.module_values),
                        JSXExpr::JSXEmptyExpr(_) => None,
                    },
                    _ => None,
                };
                if let Some(value) = module_value {
                    statics.push(object_prop(prop_key(&key), value));
                    continue;
                }
                return Err(expression_refusal(
                    attr.span,
                    &format!("{key}={{…}} on <{tag}>"),
                    FOLDED_ATTRIBUTE_VALUES,
                ));
            }
        };
        let name = claim_port_name(&port, attr.span, walk)?;
        body.push(member_call_stmt(&cursor, "port", vec![str_lit(&key), name]));
    }

    let kids = collect_kids(el, &tag, walk)?;
    if content_taken && !kids.is_empty() {
        return Err((
            el.span,
            format!(
                "Exodra JSX: <{tag}> has unsafeHtml={{…}} and children. unsafeHtml stands for \
                 EVERYTHING inside its element, so it cannot share the element with anything \
                 else."
            ),
        ));
    }
    let text_port = kids.iter().find_map(|kid| match kid {
        DeclaredKid::TextPort(name) => Some(name.clone()),
        _ => None,
    });
    if let Some(name) = text_port {
        if kids.len() > 1 {
            return Err((
                el.span,
                format!(
                    "Exodra JSX: {{$.{name}}} inside <{tag}> stands beside other children. A \
                     text port is its element's whole content, so text that varies goes in an \
                     element of its own: <span>{{$.{name}}}</span>."
                ),
            ));
        }
    }

    for kid in &kids {
        match kid {
            DeclaredKid::Text(value) => {
                body.push(member_call_stmt(&cursor, "text", vec![str_lit(value)]))
            }
            DeclaredKid::Element(node) => {
                body.push(emit_declared_element(node, &cursor, depth + 1, walk)?)
            }
            DeclaredKid::TextPort(port) => {
                let name = claim_port_name(port, el.span, walk)?;
                body.push(member_call_stmt(&cursor, "textPort", vec![name]));
            }
            DeclaredKid::ChildrenPort(port) => {
                let name = claim_port_name(port, el.span, walk)?;
                body.push(member_call_stmt(&cursor, "childrenPort", vec![name]));
            }
        }
    }

    let mut args: Vec<Expr> = vec![str_lit(&tag)];
    if !statics.is_empty() {
        args.push(object(statics));
    } else if !body.is_empty() {
        args.push(null_expr());
    }
    if !body.is_empty() {
        args.push(arrow(vec![pat_ident(&cursor)], body));
    }
    Ok(member_call_stmt(parent, "el", args))
}
