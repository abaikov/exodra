import { EXO_HTML_NS, EXO_MATHML_NS, EXO_SVG_NS } from '@exodra/core';
import { EXO_MATHML_TEXT_INTEGRATION } from './EXO_MATHML_TEXT_INTEGRATION';
import { EXO_SVG_HTML_INTEGRATION } from './EXO_SVG_HTML_INTEGRATION';
import { EXO_SVG_TAG_ADJUST } from './EXO_SVG_TAG_ADJUST';
import { exoAttrIdentity } from '../exoAttrIdentity';
import { exoSvgRootedSchema } from '../exoSvgRootedSchema';
import type { TExoForeignNamespaces } from '../types/TExoForeignNamespaces';

export const EXO_FOREIGN_NAMESPACES: TExoForeignNamespaces = {
    rootNamespace(schema, rootLower) {
        if (rootLower === 'svg' || exoSvgRootedSchema(schema, rootLower)) return EXO_SVG_NS;
        if (rootLower === 'math') return EXO_MATHML_NS;
        return EXO_HTML_NS;
    },
    createElement(doc, lower, ns) {
        return doc.createElementNS(
            ns,
            ns === EXO_SVG_NS ? EXO_SVG_TAG_ADJUST.get(lower) ?? lower : lower
        );
    },
    attrIdentity: exoAttrIdentity,
    htmlIntegrationPoint(ns, lower, attrs) {
        if (ns === EXO_SVG_NS) return EXO_SVG_HTML_INTEGRATION.has(lower);
        if (ns !== EXO_MATHML_NS) return false;
        if (EXO_MATHML_TEXT_INTEGRATION.has(lower)) return true;
        if (lower !== 'annotation-xml') return false;
        if (attrs === undefined || attrs === null) return false;
        for (const name in attrs) {
            if (name.toLowerCase() !== 'encoding') continue;
            const encoding = String(attrs[name]).toLowerCase();
            return encoding === 'text/html' || encoding === 'application/xhtml+xml';
        }
        return false;
    },
};
