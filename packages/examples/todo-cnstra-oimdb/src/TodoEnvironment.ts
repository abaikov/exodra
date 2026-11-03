import { CNSExodraEnvironment } from '@cnstra/exodra';
import type { TExoDomNode } from '@exodra/dom';
import type { TTodoServices } from './types/TTodoServices';

export const TodoEnvironment = new CNSExodraEnvironment({
    defaultCNSOf: (node: TExoDomNode & TTodoServices) => node.cns,
});
