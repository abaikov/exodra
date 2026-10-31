import { EXO_PORT_ATTR_STRING, EXO_PORT_ATTR_TOGGLE } from '@exodra/core';
import type { TExoPortKind } from '@exodra/core';
import { writeExoAttr } from '../dom/writers/writeExoAttr';
import { writeExoAttrString } from '../dom/writers/writeExoAttrString';
import { writeExoAttrToggle } from '../dom/writers/writeExoAttrToggle';
import { writeExoClassAttr } from '../dom/writers/writeExoClassAttr';
import { writeExoClassName } from '../dom/writers/writeExoClassName';
import { writeExoNsAttr } from '../dom/writers/writeExoNsAttr';
import { writeExoNsAttrString } from '../dom/writers/writeExoNsAttrString';
import { writeExoNsAttrToggle } from '../dom/writers/writeExoNsAttrToggle';
import { writeExoResetProperty } from '../dom/writers/writeExoResetProperty';
import { writeExoStringProperty } from '../dom/writers/writeExoStringProperty';
import type { TExoAttrIdentity } from '../dom/types/TExoAttrIdentity';
import type { TExoDomSetter } from '../dom/types/TExoDomSetter';
import type { TExoResetProperty } from '../dom/types/TExoResetProperty';

/** Compares the ATTRIBUTE even where the live setter writes a property: what is asked is what the
 * SERVER printed. Each shipped body has its own row, because the body is what fixes both halves of
 * the question — WHICH attribute the schema decided this port is, and what markup the value would
 * have come from. A body this file does not know is a writers pack's own, and only the port's
 * declared KIND is left to answer the second half with. Ports whose value markup cannot carry
 * never arrive (`compileExoHydrateSchema` leaves them their real setter); a nameless port is
 * exempt, nothing to read. See `packages/dom/README.md`. */
export function repairExoAttribute(
    node: Element,
    name: string | null,
    kind: TExoPortKind,
    value: unknown,
    setter: TExoDomSetter,
    data: unknown
): void {
    if (name === null) return;

    // `getAttribute` answers `null` for an attribute that is not there — the one state `''` does NOT
    // express.
    let showing: string | null;
    let wanted: string | null;
    if (setter === writeExoClassName || setter === writeExoClassAttr) {
        showing = node.getAttribute('class');
        wanted = value == null ? '' : String(value);
    } else if (setter === writeExoResetProperty) {
        showing = node.getAttribute((data as TExoResetProperty).markup);
        // Read from the attribute's PRESENCE — `checked="false"` is a ticked box.
        wanted = value ? '' : null;
    } else if (setter === writeExoStringProperty) {
        showing = node.getAttribute(name.toLowerCase());
        // `[LegacyNullToEmptyString]` on `HTMLInputElement.value`: `null` means EMPTY.
        wanted = value == null ? '' : String(value);
    } else if (setter === writeExoAttrString || setter === writeExoNsAttrString) {
        showing = readExoAttrAt(node, data as TExoAttrIdentity);
        wanted = String(value);
    } else if (setter === writeExoAttrToggle || setter === writeExoNsAttrToggle) {
        showing = readExoAttrAt(node, data as TExoAttrIdentity);
        wanted = value ? '' : null;
    } else if (setter === writeExoAttr || setter === writeExoNsAttr) {
        showing = readExoAttrAt(node, data as TExoAttrIdentity);
        wanted = markupFromExoAbsenceRule(value);
    } else {
        showing = node.getAttribute(name.toLowerCase());
        if (kind === EXO_PORT_ATTR_STRING) wanted = String(value);
        else if (kind === EXO_PORT_ATTR_TOGGLE) wanted = value ? '' : null;
        else wanted = markupFromExoAbsenceRule(value);
    }
    if (showing === wanted) return;
    setter(node, value, data);
}

/** Through the identity the compiler handed the writer, never through the name again: `getAttribute`
 * lowercases the name it is given only on an element in the HTML namespace, so `'viewbox'` finds
 * nothing on the `viewBox` an SVG element actually carries. */
function readExoAttrAt(node: Element, at: TExoAttrIdentity): string | null {
    return typeof at === 'string' ? node.getAttribute(at) : node.getAttributeNS(at.ns, at.local);
}

function markupFromExoAbsenceRule(value: unknown): string | null {
    if (value == null || value === false) return null;
    return value === true ? '' : String(value);
}
