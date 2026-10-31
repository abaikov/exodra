import { exoDomPropertyKind } from '@exodra/core';

/**
 * Would a browser handed the markup, and no fill, end up in this port's state? Not
 * `writes-exo-attribute` under another name: that answers `false` for `checked` on an `<input>`
 * where this answers `true`. Only `exoDomPropertyKind`'s `false` — a property no markup can express
 * (`indeterminate`, `value` on a `<textarea>`) — is `false` here.
 */
export function markupCarriesExoValue(name: string | null, proto: Element): boolean {
    if (name === null) return true;
    return exoDomPropertyKind(proto.localName, name) !== false;
}
