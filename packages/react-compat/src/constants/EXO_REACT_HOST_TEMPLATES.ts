import type { TExoReactElement } from '../types/TExoReactElement';

export const EXO_REACT_HOST_TEMPLATES = {
    readTemplatedElement: null as
        | ((component: object, element: TExoReactElement) => TExoReactElement | null)
        | null,
    cacheSymbol: Symbol('exo.react.hostTemplates'),
    perComponent: 8,
};
