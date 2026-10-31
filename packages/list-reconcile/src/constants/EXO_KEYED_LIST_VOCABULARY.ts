import { createExoKeyedList } from '../createExoKeyedList';
import type { TExoKeyedListApi } from '../types/TExoKeyedListApi';
import type { TExoPlacedChildren } from '../types/TExoPlacedChildren';

export const EXO_KEYED_LIST_VOCABULARY: {
    readonly [K in keyof TExoKeyedListApi]: () => TExoKeyedListApi[K];
} = {
    keyedList: () =>
        function (port, keyOf, build, update) {
            return createExoKeyedList(
                this.childList(port) as TExoPlacedChildren<typeof this>,
                keyOf,
                build,
                update
            );
        },
};
