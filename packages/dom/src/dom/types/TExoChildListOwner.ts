import type { TExoChildList } from './TExoChildList';
import type { TExoDomChild } from './TExoDomChild';

export type TExoChildListOwner = {
    materializeExoChild(child: TExoDomChild, list: TExoChildList, at: number): void;
};
