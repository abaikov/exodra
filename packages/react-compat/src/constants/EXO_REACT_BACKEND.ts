import { ExoDomBackend, withExoCompiler, withExoForeignNamespaces } from '@exodra/dom';

export const EXO_REACT_BACKEND = withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()));
