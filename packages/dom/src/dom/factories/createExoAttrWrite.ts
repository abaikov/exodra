import {
    EXO_DOM_STRING_PROPERTIES,
    EXO_PORT_ATTR_STRING,
    EXO_PORT_ATTR_TOGGLE,
    exoDomPropertyKind,
} from '@exodra/core';
import type { TExoAttrPortKind } from '@exodra/core';
import { EXO_HTML_NS } from '@exodra/core';
import { writeExoAttr } from '../writers/writeExoAttr';
import { writeExoAttrString } from '../writers/writeExoAttrString';
import { writeExoAttrToggle } from '../writers/writeExoAttrToggle';
import { writeExoClassAttr } from '../writers/writeExoClassAttr';
import { writeExoClassName } from '../writers/writeExoClassName';
import { writeExoNsAttr } from '../writers/writeExoNsAttr';
import { writeExoNsAttrString } from '../writers/writeExoNsAttrString';
import { writeExoNsAttrToggle } from '../writers/writeExoNsAttrToggle';
import { writeExoProperty } from '../writers/writeExoProperty';
import { writeExoResetProperty } from '../writers/writeExoResetProperty';
import { writeExoStringProperty } from '../writers/writeExoStringProperty';
import type { TExoAttrIdentity } from '../types/TExoAttrIdentity';
import type { TExoAttrWrite } from '../types/TExoAttrWrite';

// Every question about the NAME is answered once per schema, not per binding (`namespaceURI` is an
// IDL accessor). WHICH attribute to write arrives as `at` — the compiler built the element and knows
// what a parser would have made of the name there (`viewbox` → `viewBox`, `xlink:href` into the XLink
// namespace), so this factory is told rather than reading the answer back off the prototype.
export function createExoAttrWrite(
    name: string,
    proto: Element,
    kind: TExoAttrPortKind,
    at: TExoAttrIdentity
): TExoAttrWrite {
    const markup = name.toLowerCase();

    // Asked of the TAG and not the name: on an `<option>`, `value` IS the reflected attribute, and
    // `option.value = null` leaves `value="null"` where the attribute rule removes it.
    const property = exoDomPropertyKind(proto.localName, name);
    if (property !== undefined) {
        if (EXO_DOM_STRING_PROPERTIES.has(name)) {
            return { write: writeExoStringProperty, data: name };
        }
        // Property AND attribute, in that order, for a boolean property markup can express: the
        // attribute is the control's RESET value, so a client-rendered `checked={false}` box came
        // back ticked on `form.reset()`.
        if (property === true) {
            return { write: writeExoResetProperty, data: { key: name, markup } };
        }
        return { write: writeExoProperty, data: name };
    }

    if (markup === 'class') {
        return proto.namespaceURI === EXO_HTML_NS
            ? { write: writeExoClassName, data: null }
            : { write: writeExoClassAttr, data: null };
    }

    // A namespaced attribute needs both spellings on every fill: `setAttributeNS` takes the
    // QUALIFIED name and `removeAttributeNS` the LOCAL one.
    if (typeof at !== 'string') {
        if (kind === EXO_PORT_ATTR_STRING) return { write: writeExoNsAttrString, data: at };
        if (kind === EXO_PORT_ATTR_TOGGLE) return { write: writeExoNsAttrToggle, data: at };
        return { write: writeExoNsAttr, data: at };
    }

    if (kind === EXO_PORT_ATTR_STRING) return { write: writeExoAttrString, data: at };
    if (kind === EXO_PORT_ATTR_TOGGLE) return { write: writeExoAttrToggle, data: at };
    return { write: writeExoAttr, data: at };
}
