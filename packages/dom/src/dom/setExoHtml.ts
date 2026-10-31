import type { TExoDomSetter } from './types/TExoDomSetter';

/**
 * A children port filled with raw markup — the browser half of `unsafeHtml`.
 *
 * `innerHTML` is enough here and only here: `compileExoDomSchema` installs this setter ONLY for a
 * port that is its element's sole child, since a port among static siblings would lose them. Every
 * other children port keeps `exoUnsettableSharedContent`. It sanitises nothing, deliberately: the author has
 * just typed `unsafe`.
 */
export const setExoHtml: TExoDomSetter = (node, value) => {
    node.innerHTML = value == null ? '' : String(value);
};
