import type { TExoAttrPortKind } from '@exodra/core';
import type { TExoAttrIdentity } from '../../dom/types/TExoAttrIdentity';
import type { TExoAttrWrite } from '../../dom/types/TExoAttrWrite';
import type { TExoDomSetter } from '../../dom/types/TExoDomSetter';

// What a backend's `writers` member provides. `attr`/`text` run ONCE per port per (schema,
// composition), so `proto` is the PROTOTYPE element and must not be closed over. See the README.
export type TExoWritersApi = {
    /** Whose writers these are, for diagnostics. Nothing branches on it. */
    readonly name: string;
    /** One attribute port's body and the datum that body is handed on every fill: the author's
     *  spelling, that port's prototype element, the kind the author DECLARED, and `at` — which
     *  attribute a parser would call this on THAT element, so a pack that writes an attribute
     *  writes the one the statics beside it got rather than deciding the spelling a second time. */
    attr(name: string, proto: Element, kind: TExoAttrPortKind, at: TExoAttrIdentity): TExoAttrWrite;
    /** Would markup ALONE reach this value's state (`null` = text port)? Read by hydration, which
     *  silences the ports the server printed and keeps the ones it could not. */
    markupCarries(name: string | null, proto: Element): boolean;
    /** The text-port writer: handed the ELEMENT unless what it returns sets `takesTextNode`. */
    text(proto: Element): TExoDomSetter;
};
