import type { TExoChildrenPort } from '@exodra/core';
import type { TExoChildList } from './TExoChildList';

export type TExoDomPortChildList = {
    portChildList(port: TExoChildrenPort): TExoChildList;
};
