import { EXO_DUAL_NAMESPACE_TAGS } from './constants/EXO_DUAL_NAMESPACE_TAGS';
import { EXO_SVG_ONLY_TAGS } from './constants/EXO_SVG_ONLY_TAGS';
import {
    EXO_PORT_ATTR,
    EXO_PORT_ATTR_STRING,
    EXO_PORT_ATTR_TOGGLE,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_REF,
    EXO_PORT_TEXT,
    mintExoPort,
} from '@exodra/core';
import type {
    TExoAnyPort,
    TExoAttrPort,
    TExoChildrenPort,
    TExoEmitter,
    TExoEventPort,
    TExoRefPort,
    TExoCursorDeclaration,
    TExoTextPort,
} from '@exodra/core';

// Decided from the schema's own markup alone. Why the throwaway `<svg>` rather than
// `createElementNS` (measured 27% slower per instance here), and the divergence this accepts:
// ../../README.md § SVG-rooted schemas.
//
// The root's NAMESPACE has to be settled before its element can be made, and for the four tags
// that are real in BOTH namespaces the answer is in the markup BELOW the root — the one question
// `compileExoDomSchema` cannot answer as the calls arrive. So those four, and only those four, pay
// for a tag-only replay of the markup here before the prototype is built.
export function exoSvgRootedSchema(schema: TExoCursorDeclaration, rootLower: string): boolean {
    // A root `<svg>` is foreign content on its own; wrapping would nest one `<svg>` in another.
    if (rootLower === 'svg') return false;
    if (EXO_SVG_ONLY_TAGS.has(rootLower)) return true;
    if (!EXO_DUAL_NAMESPACE_TAGS.has(rootLower)) return false;
    const probe = new ExoSvgProbe(schema);
    schema.build(probe);
    return probe.found;
}

// The `<svg>` stop is the point: `<a><svg><circle/></svg></a>` is an HTML link around an icon,
// because the nested `<svg>` opens foreign content by itself. `<a><circle/></a>` is not.
class ExoSvgProbe implements TExoEmitter {
    found = false;
    private readonly supply: TExoAnyPort[];
    private next: number;

    constructor(schema: TExoCursorDeclaration) {
        this.supply = schema.portList;
        this.next = schema.declaredPorts;
    }

    private minted<TPort extends TExoAnyPort>(
        kind: TExoAnyPort['kind'],
        name: string | null
    ): TPort {
        return mintExoPort<TPort>(this.supply, this.next++, kind, name);
    }

    el(
        tag: string,
        _attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (emitter: TExoEmitter) => void
    ): this {
        const lower = tag.toLowerCase();
        if (lower !== 'svg') {
            if (EXO_SVG_ONLY_TAGS.has(lower)) this.found = true;
            if (fn !== undefined) fn(this);
        }
        return this;
    }

    text(): this {
        return this;
    }

    attrPort(port: TExoAttrPort, name: string): TExoAttrPort;
    attrPort(name: string, portName?: string): TExoAttrPort;
    attrPort(first: TExoAttrPort | string): TExoAttrPort {
        return typeof first === 'string' ? this.minted<TExoAttrPort>(EXO_PORT_ATTR, first) : first;
    }

    stringPort(port: TExoAttrPort, name: string): TExoAttrPort;
    stringPort(name: string, portName?: string): TExoAttrPort;
    stringPort(first: TExoAttrPort | string): TExoAttrPort {
        return typeof first === 'string'
            ? this.minted<TExoAttrPort>(EXO_PORT_ATTR_STRING, first)
            : first;
    }

    togglePort(port: TExoAttrPort, name: string): TExoAttrPort;
    togglePort(name: string, portName?: string): TExoAttrPort;
    togglePort(first: TExoAttrPort | string): TExoAttrPort {
        return typeof first === 'string'
            ? this.minted<TExoAttrPort>(EXO_PORT_ATTR_TOGGLE, first)
            : first;
    }

    port(name: string, portName?: string): TExoAttrPort {
        return this.attrPort(name, portName);
    }

    eventPort(port: TExoEventPort, name: string): TExoEventPort;
    eventPort(name: string, portName?: string): TExoEventPort;
    eventPort(first: TExoEventPort | string): TExoEventPort {
        return typeof first === 'string'
            ? this.minted<TExoEventPort>(EXO_PORT_EVENT, first)
            : first;
    }

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: string): TExoRefPort;
    refPort(given?: TExoRefPort | string): TExoRefPort {
        return given === undefined || typeof given === 'string'
            ? this.minted<TExoRefPort>(EXO_PORT_REF, null)
            : given;
    }

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: string): TExoTextPort;
    textPort(given?: TExoTextPort | string): TExoTextPort {
        return given === undefined || typeof given === 'string'
            ? this.minted<TExoTextPort>(EXO_PORT_TEXT, null)
            : given;
    }

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: string): TExoChildrenPort;
    childrenPort(given?: TExoChildrenPort | string): TExoChildrenPort {
        return given === undefined || typeof given === 'string'
            ? this.minted<TExoChildrenPort>(EXO_PORT_CHILDREN, null)
            : given;
    }
}
