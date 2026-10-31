import type { TExoChildrenPort } from '../ports/types/TExoChildrenPort';
import type { TExoAttrPort } from '../ports/types/TExoAttrPort';
import type { TExoTextPort } from '../ports/types/TExoTextPort';

export interface TExoFillDoors {
    /** Every call writes. Nothing records a fill and nothing sweeps a skipped port; on the server
     * the markup is already taken, which `node/tests/a-fill-after-the-markup-was-taken` pins. */
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
}
