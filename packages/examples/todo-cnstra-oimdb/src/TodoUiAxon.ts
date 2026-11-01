import { cnsCollateral } from '@cnstra/core';
import type { TTodoFilter } from './types/TTodoFilter';

export const TodoUiAxon = {
    newTodoEntered: cnsCollateral<{ title: string }>(),
    toggleClicked: cnsCollateral<{ id: string; done: boolean }>(),
    destroyClicked: cnsCollateral<{ id: string }>(),
    titleEdited: cnsCollateral<{ id: string; title: string }>(),
    clearCompletedClicked: cnsCollateral(),
    filterLinkClicked: cnsCollateral<{ filter: TTodoFilter }>(),
};
