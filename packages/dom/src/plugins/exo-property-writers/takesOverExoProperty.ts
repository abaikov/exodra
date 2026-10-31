import { EXO_GLOBAL_ATTRIBUTES } from './constants/EXO_GLOBAL_ATTRIBUTES';

// The default rule, asked ONCE per attribute port per (schema, composition), at compile time. Three
// tests, each a refusal: the tag must be hyphenated; the name must not be a global attribute; the
// name must contain no `-` or `:`. `localName` and not `tagName`, which is uppercased on an HTML
// element. It must be pure in (name, tag): `attr` and `markupCarries` agree only by both asking it.
export function takesOverExoProperty(name: string, proto: Element): boolean {
    if (proto.localName.indexOf('-') <= 0) return false;
    if (EXO_GLOBAL_ATTRIBUTES.has(name)) return false;
    return name.indexOf('-') < 0 && name.indexOf(':') < 0;
}
