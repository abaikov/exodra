import { EXO_PORT_TEXT } from '@exodra/core';
import type { TExoPortKind } from '@exodra/core';
import { repairExoAttribute } from '../repairExoAttribute';
import { repairExoHtml } from '../repairExoHtml';
import type { TExoDomSetter } from '../../dom/types/TExoDomSetter';

/**
 * WHAT A FILL DOES DURING AN ADOPTING PASS: read what the server printed, compare, and write only on
 * disagreement. The server and the browser can hold different data — a clock, a session, a row
 * deleted between the two — and a pass that silently kept the markup would hand the reader a page
 * the client render would never have drawn.
 *
 * ANY FILL REPAIRS, not only one watching a source. The narrower rule existed because the compare
 * lived behind `bind`, and `bind` is not a door on an exonode any more: a port is filled by
 * `c.attr`/`c.text`/`c.html`, so the compare belongs to the fill.
 *
 * ONE CLOSURE PER PORT PER SCHEMA PER BACKEND, built where the hydrate schema is derived. Per
 * instance it costs nothing: a fill stays the same two array loads and one indirect call. Per fill
 * it costs one DOM read and one compare, paid once on a page's single adopting pass.
 */
export function createExoRepairingFill(
    name: string | null,
    kind: TExoPortKind,
    live: TExoDomSetter
): TExoDomSetter {
    if (kind === EXO_PORT_TEXT) {
        // The slot holds the Text node itself where the live writer declared `takesTextNode`, and
        // the element where a pack's writer did not.
        const repair: TExoDomSetter =
            live.takesTextNode === true
                ? (node, value): void => {
                      const text = node as unknown as Text;
                      const wanted = value == null ? '' : String(value);
                      if (text.data !== wanted) text.data = wanted;
                  }
                : (node, value, data): void => {
                      const wanted = value == null ? '' : String(value);
                      if (node.textContent !== wanted) live(node, value, data);
                  };
        return repair;
    }

    const repairing: TExoDomSetter = (node, value, data): void =>
        repairExoAttribute(node, name, kind, value, live, data);
    return repairing;
}

/** Raw markup is its own compare: the parser respells what it is given, so two strings differing by
 *  a quote or an implicit `<tbody>` are the same page and must not be rebuilt. */
export function createExoRepairingHtmlFill(): TExoDomSetter {
    return (node, value): void => repairExoHtml(node, value);
}
