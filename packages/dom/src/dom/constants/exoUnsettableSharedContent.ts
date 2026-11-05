import type { TExoDomSetter } from '../types/TExoDomSetter';

/**
 * What a children port's setter slot holds when the port SHARES its element, so that the slot is
 * never empty. Raw markup is the one value this port kind would take, but `innerHTML` replaces
 * everything in the element, so it is offered only where the port is its element's sole child
 * (`set-html`). An empty slot instead would make `set()` a call on `undefined`.
 * `hydrate/assert-content-adopt` is split at the same place on purpose.
 */
export const exoUnsettableSharedContent: TExoDomSetter = (node) => {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `createExoSchema(dom): the children port on <${node.tagName.toLowerCase()}> cannot be ` +
              'filled with set() — it shares its element with other children.' +
              ' The only way to write raw markup is innerHTML, which would destroy them. Nested ' +
              'instances go through one(), list() or appendChild(); raw markup (unsafeHtml) needs ' +
              "a port that is its element's ONLY child."
            : 'EXO0047'
    );
};
