import { composeExoPlugins } from '@exodra/core';
import { EXO_DOM_CHILD_LIST_VOCABULARY } from './constants/EXO_DOM_CHILD_LIST_VOCABULARY';
import type { TExoDomApi } from './types/TExoDomApi';

export const withExoChildList = <TBase extends TExoDomApi>(base: TBase): TBase =>
    composeExoPlugins(base, EXO_DOM_CHILD_LIST_VOCABULARY) as TBase;
