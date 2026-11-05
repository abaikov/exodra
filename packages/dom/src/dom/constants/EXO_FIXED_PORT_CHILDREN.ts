import { refuseExoFixedPortChildren } from '../asserts/refuseExoFixedPortChildren';
import type { TExoChildList } from '../types/TExoChildList';

export const EXO_FIXED_PORT_CHILDREN: TExoChildList = Object.freeze({
    get size(): number {
        return refuseExoFixedPortChildren();
    },
    at: refuseExoFixedPortChildren,
    insert: refuseExoFixedPortChildren,
    move: refuseExoFixedPortChildren,
    remove: refuseExoFixedPortChildren,
    removeAll: refuseExoFixedPortChildren,
    detach: refuseExoFixedPortChildren,
    detachAll: refuseExoFixedPortChildren,
    attach: refuseExoFixedPortChildren,
    indexOf: refuseExoFixedPortChildren,
    takeServed: refuseExoFixedPortChildren,
    dropUnclaimedServed: (): void => undefined,
});
