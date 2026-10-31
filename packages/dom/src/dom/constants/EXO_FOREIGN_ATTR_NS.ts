import { EXO_XLINK_NS, EXO_XML_NS, EXO_XMLNS_NS } from '@exodra/core';
import type { TExoNsAttr } from '../types/TExoNsAttr';

/**
 * By lowercase markup spelling: the attribute a parser makes of it. The LOCAL name is spelled out
 * beside the qualified one because `setAttributeNS` takes the qualified form and
 * `removeAttributeNS` the local one, and a writer holding this row does both; a row is shared by
 * every port of that name in the process, so neither compiling a schema nor filling one allocates.
 */
export const EXO_FOREIGN_ATTR_NS: ReadonlyMap<string, TExoNsAttr> = new Map<string, TExoNsAttr>([
    ['xlink:actuate', { ns: EXO_XLINK_NS, qualified: 'xlink:actuate', local: 'actuate' }],
    ['xlink:arcrole', { ns: EXO_XLINK_NS, qualified: 'xlink:arcrole', local: 'arcrole' }],
    ['xlink:href', { ns: EXO_XLINK_NS, qualified: 'xlink:href', local: 'href' }],
    ['xlink:role', { ns: EXO_XLINK_NS, qualified: 'xlink:role', local: 'role' }],
    ['xlink:show', { ns: EXO_XLINK_NS, qualified: 'xlink:show', local: 'show' }],
    ['xlink:title', { ns: EXO_XLINK_NS, qualified: 'xlink:title', local: 'title' }],
    ['xlink:type', { ns: EXO_XLINK_NS, qualified: 'xlink:type', local: 'type' }],
    ['xml:lang', { ns: EXO_XML_NS, qualified: 'xml:lang', local: 'lang' }],
    ['xml:space', { ns: EXO_XML_NS, qualified: 'xml:space', local: 'space' }],
    ['xmlns', { ns: EXO_XMLNS_NS, qualified: 'xmlns', local: 'xmlns' }],
    ['xmlns:xlink', { ns: EXO_XMLNS_NS, qualified: 'xmlns:xlink', local: 'xlink' }],
]);
