import { collateral } from '@cnstra/core';
import type { TTodoFilter } from './types/TTodoFilter';

export const TodoUiAxon = {
    newTodoEntered: collateral<{ title: string }>(),
    toggleClicked: collateral<{ id: string; done: boolean }>(),
    toggleAllClicked: collateral<{ done: boolean }>(),
    destroyClicked: collateral<{ id: string }>(),
    titleEdited: collateral<{ id: string; title: string }>(),
    clearCompletedClicked: collateral(),
    filterLinkClicked: collateral<{ filter: TTodoFilter }>(),
};
