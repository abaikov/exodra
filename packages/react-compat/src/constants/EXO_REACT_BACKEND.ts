import {
    ExoDomBackend,
    withExoChildList,
    withExoCompiler,
    withExoForeignNamespaces,
} from '@exodra/dom';

export const EXO_REACT_BACKEND = withExoChildList(
    withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()))
);
