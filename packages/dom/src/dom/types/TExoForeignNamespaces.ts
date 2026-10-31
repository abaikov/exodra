import type { TExoCursorDeclaration } from '@exodra/core';
import type { TExoAttrIdentity } from './TExoAttrIdentity';

export type TExoForeignNamespaces = {
    rootNamespace(schema: TExoCursorDeclaration, rootLower: string): string;
    createElement(doc: Document, lower: string, ns: string): Element;
    attrIdentity(markup: string, ns: string): TExoAttrIdentity;
    htmlIntegrationPoint(
        ns: string,
        lower: string,
        attrs?: Readonly<Record<string, unknown>> | null
    ): boolean;
};
